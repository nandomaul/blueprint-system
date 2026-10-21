import type {EditorProfile} from '../domain/catalog.ts';
export function ProfileAvatar({profile,name}:{profile?:EditorProfile;name?:string}){const label=profile?.name??name??'?';return <span className="profile-avatar">{profile?.avatar?<img src={profile.avatar} alt=""/>:label[0].toUpperCase()}</span>;}
