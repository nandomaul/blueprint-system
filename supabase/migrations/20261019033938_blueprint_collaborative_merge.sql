-- MAP-004: merge independent edits while rejecting competing changes to the same field.
-- Additive functions only. Existing data, membership, RLS and immutable assets remain intact.
begin;
create function public.bp_merge_json(b jsonb,l jsonb,r jsonb,p text default 'project',depth integer default 0) returns jsonb
language plpgsql immutable set search_path='' as $$
declare result jsonb; value jsonb; k text; bi jsonb; li jsonb; ri jsonb; bo jsonb; lo jsonb; ro jsonb; chosen jsonb; keys jsonb; keyed boolean;
begin
 if depth>32 then raise exception 'Snapshot terlalu dalam'; end if;
 if l is not distinct from b then return r; end if;
 if r is not distinct from b or l is not distinct from r then return l; end if;
 if p='project.updatedAt' and jsonb_typeof(l)='string' and jsonb_typeof(r)='string' then return greatest(l,r); end if;
 if jsonb_typeof(l)='object' and jsonb_typeof(r)='object' and (jsonb_typeof(b)='object' or b is null) then
  result:='{}';
  for k in select jsonb_object_keys(coalesce(b,'{}')||l||r) loop
   value:=public.bp_merge_json(b->k,l->k,r->k,p||'.'||k,depth+1);
   if value is not null then result:=result||jsonb_build_object(k,value); end if;
  end loop; return result;
 end if;
 if jsonb_typeof(b)='array' and jsonb_typeof(l)='array' and jsonb_typeof(r)='array' then
  keyed:=not exists(select 1 from jsonb_array_elements(b||l||r) x where jsonb_typeof(x)<>'object' or jsonb_typeof(x->'id') is distinct from 'string');
  if keyed then
   foreach value in array array[b,l,r] loop
    if (select count(distinct x->>'id') from jsonb_array_elements(value) x)<>jsonb_array_length(value) then keyed:=false; end if;
   end loop;
  end if;
  if keyed or p='project.presentation' and not exists(select 1 from jsonb_array_elements(b||l||r) x where jsonb_typeof(x)<>'string') then
   if keyed then
    select coalesce(jsonb_agg(x->'id'),'[]') into bi from jsonb_array_elements(b) x;
    select coalesce(jsonb_agg(x->'id'),'[]') into li from jsonb_array_elements(l) x;
    select coalesce(jsonb_agg(x->'id'),'[]') into ri from jsonb_array_elements(r) x;
   else bi:=b;li:=l;ri:=r; end if;
   select coalesce(jsonb_agg(x),'[]') into bo from jsonb_array_elements(bi) x where li @> jsonb_build_array(x) and ri @> jsonb_build_array(x);
   select coalesce(jsonb_agg(x),'[]') into lo from jsonb_array_elements(li) x where bo @> jsonb_build_array(x);
   select coalesce(jsonb_agg(x),'[]') into ro from jsonb_array_elements(ri) x where bo @> jsonb_build_array(x);
   if lo<>bo and ro<>bo and lo<>ro then raise exception 'CONFLICT: Urutan berubah bersamaan: %',p using errcode='40001'; end if;
   chosen:=case when lo=bo then ri else li end;
   select coalesce(jsonb_agg(x order by first_pos),'[]') into keys from (select x,min(pos) first_pos from jsonb_array_elements(chosen||ri||li||bi) with ordinality t(x,pos) group by x) unique_keys;
   result:='[]';
   for k in select jsonb_array_elements_text(keys) loop
    if keyed then
     value:=public.bp_merge_json((select x from jsonb_array_elements(b) x where x->>'id'=k),(select x from jsonb_array_elements(l) x where x->>'id'=k),(select x from jsonb_array_elements(r) x where x->>'id'=k),p||'['||k||']',depth+1);
     if value is not null then result:=result||jsonb_build_array(value); end if;
    elsif not bi @> jsonb_build_array(k) or li @> jsonb_build_array(k) and ri @> jsonb_build_array(k) then result:=result||jsonb_build_array(k);
    end if;
   end loop; return result;
  end if;
 end if;
 raise exception 'CONFLICT: Bagian yang sama diubah bersamaan: %. Draft tetap disimpan.',p using errcode='40001';
end; $$;
revoke all on function public.bp_merge_json(jsonb,jsonb,jsonb,text,integer) from public,anon,authenticated;

create function public.bp_merge_document(p_workspace_id uuid,p_project_id text,p_expected_token uuid,p_base jsonb,p_local jsonb,p_profile text,p_label text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_doc public.bp_documents%rowtype; combined jsonb; saved jsonb;
begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak'; end if;
 if p_base is null or p_local is null or octet_length(p_base::text)>2000000 or octet_length(p_local::text)>2000000 or p_base->>'id' is distinct from p_project_id or p_local->>'id' is distinct from p_project_id then raise exception 'Snapshot dasar tidak valid'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||'/'||p_project_id,3));
 select * into current_doc from public.bp_documents where workspace_id=p_workspace_id and project_id=p_project_id for update;
 if not found then raise exception 'CONFLICT: Proyek tim tidak ditemukan' using errcode='40001'; end if;
 if current_doc.token=p_expected_token then combined:=p_local;
 else combined:=public.bp_merge_json(p_base,p_local,current_doc.payload); end if;
 -- Check relationships that two individually valid edits could invalidate after merging.
 if exists(select 1 from jsonb_array_elements(combined->'nodes') n cross join lateral jsonb_array_elements(n->'design'->'elements') e where
  (nullif(e->>'target','') is not null and not exists(select 1 from jsonb_array_elements(combined->'nodes') target where target->>'id'=e->>'target')) or
  (nullif(e->>'assetId','') is not null and not exists(select 1 from jsonb_array_elements(combined->'assets') a where a->>'id'=e->>'assetId' and a->>'nodeId'=n->>'id')) or
  (e->>'x')::numeric<0 or (e->>'y')::numeric<0 or (e->>'x')::numeric+(e->>'width')::numeric>(n->'design'->>'width')::numeric or (e->>'y')::numeric+(e->>'height')::numeric>(n->'design'->>'height')::numeric
 ) then raise exception 'CONFLICT: Ukuran halaman, tujuan tombol, atau gambar berubah bersamaan. Periksa draft sebelum memuat versi tim.' using errcode='40001'; end if;
 -- The existing writer validates membership, size, references and creates an optional checkpoint atomically.
 saved:=public.bp_write_document(p_workspace_id,p_project_id,current_doc.token,combined,p_profile,p_label);
 return saved||jsonb_build_object('payload',combined);
end; $$;
revoke all on function public.bp_merge_document(uuid,text,uuid,jsonb,jsonb,text,text) from public,anon;
grant execute on function public.bp_merge_document(uuid,text,uuid,jsonb,jsonb,text,text) to authenticated;
commit;
