-- MAP-010: serialize review sharing with project Trash.
begin;
create function blueprint_private.review_link(p_workspace_id uuid,p_project_id text,p_action text default 'get') returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.bp_review_links%rowtype;
begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses editor ditolak'; end if;
 if p_action not in ('get','create','rotate','revoke') or p_action is null then raise exception 'Aksi tidak valid'; end if;
 if not exists(select 1 from public.bp_documents where workspace_id=p_workspace_id and project_id=p_project_id) then raise exception 'Proyek tidak ditemukan'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||'/'||p_project_id,3));
 if exists(select 1 from public.bp_document_settings where workspace_id=p_workspace_id and project_id=p_project_id and trashed_at is not null) then
  if p_action in ('create','rotate') then raise exception 'Proyek berada di Trash. Pulihkan dahulu.';end if;
  if p_action='get' then return null;end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||'/'||p_project_id,5));
 select * into link from public.bp_review_links where workspace_id=p_workspace_id and project_id=p_project_id for update;
 if p_action='revoke' then update public.bp_review_links set revoked_at=now() where id=link.id;return null; end if;
 if p_action in ('create','rotate') and (link.id is null or link.revoked_at is not null or link.expires_at<=now() or p_action='rotate') then
  -- Rotate the code and clear prior visitors so old sessions lose access.
  if link.id is not null then delete from public.bp_review_visitors where link_id=link.id; end if;
  insert into public.bp_review_links(workspace_id,project_id,created_by) values(p_workspace_id,p_project_id,auth.uid())
  on conflict(workspace_id,project_id) do update set code=gen_random_uuid(),expires_at=now()+interval '30 days',revoked_at=null,created_by=auth.uid() returning * into link;
 end if;
 if link.id is null or link.revoked_at is not null or link.expires_at<=now() then return null; end if;
 return jsonb_build_object('code',link.code,'expiresAt',link.expires_at);
end; $$;
create or replace function public.bp_review_link(p_workspace_id uuid,p_project_id text,p_action text default 'get') returns jsonb language sql security invoker set search_path='' as $$select blueprint_private.review_link(p_workspace_id,p_project_id,p_action);$$;
revoke all on function blueprint_private.review_link(uuid,text,text) from public,anon;
grant execute on function blueprint_private.review_link(uuid,text,text) to authenticated;
commit;
