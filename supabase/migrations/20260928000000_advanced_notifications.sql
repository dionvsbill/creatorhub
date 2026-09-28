alter table public.notifications add column if not exists href text;
alter table public.notifications add column if not exists entity_type text;
alter table public.notifications add column if not exists entity_id text;
alter table public.notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists priority text not null default 'normal';

create index if not exists notifications_user_unread_idx on public.notifications(user_id,read_at,created_at desc);
create index if not exists notifications_entity_idx on public.notifications(entity_type,entity_id);

create or replace function private.create_notification(p_user_id uuid,p_title text,p_body text,p_type text default 'SYSTEM',p_href text default null,p_entity_type text default null,p_entity_id text default null,p_metadata jsonb default '{}'::jsonb,p_priority text default 'normal')
returns void language plpgsql security definer set search_path=public,private as $$
begin
 insert into public.notifications(user_id,title,body,type,href,entity_type,entity_id,metadata,priority)
 values(p_user_id,p_title,p_body,p_type,p_href,p_entity_type,p_entity_id,coalesce(p_metadata,'{}'::jsonb),coalesce(p_priority,'normal'));
end; $$;
revoke all on function private.create_notification(uuid,text,text,text,text,text,text,jsonb,text) from public,anon,authenticated;

create or replace function public.notify_campaign_submitted() returns trigger language plpgsql security definer set search_path=public,private as $$
begin
 if new.status='PENDING_REVIEW' then
  insert into public.notifications(user_id,title,body,type,href,entity_type,entity_id,metadata,priority)
  select id,'Campaign awaiting review',new.title||' was submitted for administrator review.','CAMPAIGN_REVIEW','/admin/campaigns/'||new.id::text,'campaign',new.id::text,jsonb_build_object('status',new.status,'advertiser_id',new.advertiser_id),'high'
  from public.profiles where role='ADMIN';
 end if;
 return new;
end; $$;

create or replace function public.notify_creator_application_events() returns trigger language plpgsql security definer set search_path=public,private as $$
begin
 if tg_op='INSERT' and new.status='PENDING' then
  insert into public.notifications(user_id,title,body,type,href,entity_type,entity_id,metadata,priority)
  select id,'New Creator Program application',coalesce((select display_name from public.profiles where id=new.user_id),'A creator')||' submitted a Creator Program application for review.','CREATOR_APPLICATION','/admin/creator-applications/'||new.id::text,'creator_application',new.id::text,jsonb_build_object('user_id',new.user_id,'status',new.status),'high' from public.profiles where role='ADMIN';
 elsif tg_op='UPDATE' and (old.status is distinct from new.status or old.review_note is distinct from new.review_note) then
  perform private.create_notification(new.user_id,'Creator application updated','Your Creator Program application is now '||replace(new.status::text,'_',' ')||case when new.review_note is not null then '. '||new.review_note else '.' end,'CREATOR_APPLICATION','/creator/application/'||new.id::text,'creator_application',new.id::text,jsonb_build_object('status',new.status,'review_note',new.review_note),'high');
 end if;
 return new;
end; $$;
drop trigger if exists creator_application_submitted_notify on public.creator_applications;
drop trigger if exists creator_application_events_notify on public.creator_applications;
create trigger creator_application_events_notify after insert or update on public.creator_applications for each row execute function public.notify_creator_application_events();

create or replace function public.notify_campaign_application_events() returns trigger language plpgsql security definer set search_path=public,private as $$
declare campaign_title text; advertiser_id uuid;
begin
 select title,advertiser_id into campaign_title,advertiser_id from public.campaigns where id=new.campaign_id;
 if tg_op='INSERT' then
  insert into public.notifications(user_id,title,body,type,href,entity_type,entity_id,metadata,priority)
  select id,'New campaign application',coalesce((select display_name from public.profiles where id=new.creator_id),'A creator')||' applied to "'||coalesce(campaign_title,'campaign')||'".','CAMPAIGN_APPLICATION','/admin/campaign-applications/'||new.id::text,'campaign_application',new.id::text,jsonb_build_object('campaign_id',new.campaign_id,'creator_id',new.creator_id,'status',new.status),'high' from public.profiles where role='ADMIN';
  if advertiser_id is not null then perform private.create_notification(advertiser_id,'New creator application','A creator applied to "'||coalesce(campaign_title,'your campaign')||'".','CAMPAIGN_APPLICATION','/advertiser/campaigns/'||new.campaign_id::text||'?tab=applications','campaign_application',new.id::text,jsonb_build_object('campaign_id',new.campaign_id,'creator_id',new.creator_id,'status',new.status),'normal'); end if;
 elsif tg_op='UPDATE' and (old.status is distinct from new.status or old.submission_url is distinct from new.submission_url or old.submission_note is distinct from new.submission_note) then
  perform private.create_notification(new.creator_id,'Campaign application updated','Your application for "'||coalesce(campaign_title,'campaign')||'" is now '||replace(new.status,'_',' ')||'.','CAMPAIGN_APPLICATION','/campaigns/'||new.campaign_id::text,'campaign_application',new.id::text,jsonb_build_object('campaign_id',new.campaign_id,'status',new.status),'high');
  if advertiser_id is not null then perform private.create_notification(advertiser_id,'Campaign application activity','A creator application for "'||coalesce(campaign_title,'campaign')||'" has new activity: '||replace(new.status,'_',' ')||'.','CAMPAIGN_APPLICATION','/advertiser/campaigns/'||new.campaign_id::text||'?tab=applications','campaign_application',new.id::text,jsonb_build_object('campaign_id',new.campaign_id,'creator_id',new.creator_id,'status',new.status),'normal'); end if;
  insert into public.notifications(user_id,title,body,type,href,entity_type,entity_id,metadata,priority)
  select id,'Campaign application activity','Application activity occurred on "'||coalesce(campaign_title,'campaign')||'".','CAMPAIGN_APPLICATION','/admin/campaign-applications/'||new.id::text,'campaign_application',new.id::text,jsonb_build_object('campaign_id',new.campaign_id,'creator_id',new.creator_id,'status',new.status),'normal' from public.profiles where role='ADMIN';
 end if;
 return new;
end; $$;
drop trigger if exists campaign_application_events_notify on public.campaign_applications;
create trigger campaign_application_events_notify after insert or update on public.campaign_applications for each row execute function public.notify_campaign_application_events();

create or replace function public.notify_support_request_events() returns trigger language plpgsql security definer set search_path=public,private as $$
begin
 if tg_op='INSERT' then
  insert into public.notifications(user_id,title,body,type,href,entity_type,entity_id,metadata,priority)
  select id,'New support request',coalesce(new.subject,'A user submitted a support request')||' — '||left(coalesce(new.message,''),180),'SUPPORT','/admin/support/'||new.id::text,'support_request',new.id::text,jsonb_build_object('request_type',new.type,'request_user_id',new.user_id,'status',new.status),'high' from public.profiles where role='ADMIN';
  perform private.create_notification(new.user_id,'Support request received','Your support request "'||new.subject||'" has been received.','SUPPORT','/support/requests/'||new.id::text,'support_request',new.id::text,jsonb_build_object('status',new.status),'normal');
 elsif old.status is distinct from new.status or old.message is distinct from new.message then
  perform private.create_notification(new.user_id,'Support request updated','Your support request "'||new.subject||'" is now '||replace(new.status,'_',' ')||'.','SUPPORT','/support/requests/'||new.id::text,'support_request',new.id::text,jsonb_build_object('status',new.status),'high');
 end if;
 return new;
end; $$;
drop trigger if exists support_request_created_notify on public.support_requests;
drop trigger if exists support_request_updated_notify on public.support_requests;
create trigger support_request_events_notify after insert or update on public.support_requests for each row execute function public.notify_support_request_events();

create or replace function public.notify_appeal_events() returns trigger language plpgsql security definer set search_path=public,private as $$
begin
 if tg_op='INSERT' then
  insert into public.notifications(user_id,title,body,type,href,entity_type,entity_id,metadata,priority)
  select id,'New appeal submitted',coalesce((select display_name from public.profiles where id=new.user_id),'A user')||' submitted an appeal: '||new.subject||'.','APPEAL','/admin/appeals/'||new.id::text,'appeal',new.id::text,jsonb_build_object('user_id',new.user_id,'status',new.status),'high' from public.profiles where role='ADMIN';
  perform private.create_notification(new.user_id,'Appeal submitted','Your appeal "'||new.subject||'" was submitted and is now in the review queue.','APPEAL','/appeal/'||new.id::text,'appeal',new.id::text,jsonb_build_object('status',new.status),'normal');
 elsif old.status is distinct from new.status or old.reviewer_note is distinct from new.reviewer_note then
  perform private.create_notification(new.user_id,'Appeal updated','Your appeal "'||new.subject||'" is now '||replace(new.status,'_',' ')||case when new.reviewer_note is not null then '. '||new.reviewer_note else '.' end,'APPEAL','/appeal/'||new.id::text,'appeal',new.id::text,jsonb_build_object('status',new.status,'reviewer_note',new.reviewer_note),'high');
 end if;
 return new;
end; $$;
drop trigger if exists appeal_events_notify on public.appeals;
create trigger appeal_events_notify after insert or update on public.appeals for each row execute function public.notify_appeal_events();

create or replace function public.notify_payment_complaint_events() returns trigger language plpgsql security definer set search_path=public,private as $$
begin
 if tg_op='INSERT' then
  insert into public.notifications(user_id,title,body,type,href,entity_type,entity_id,metadata,priority)
  select id,'New payment complaint',coalesce((select display_name from public.profiles where id=new.user_id),'A customer')||' submitted payment complaint '||new.reference||'.','PAYMENT','/admin/payment-complaints?reference='||new.reference,'payment_complaint',new.id::text,jsonb_build_object('reference',new.reference,'status',new.status),'high' from public.profiles where role='ADMIN';
  perform private.create_notification(new.user_id,'Payment complaint received','Your payment complaint for '||new.reference||' is now under review.','PAYMENT','/payment-complaint?reference='||new.reference,'payment_complaint',new.id::text,jsonb_build_object('status',new.status),'normal');
 elsif old.status is distinct from new.status or old.resolution is distinct from new.resolution or old.admin_note is distinct from new.admin_note then
  perform private.create_notification(new.user_id,'Payment complaint updated','Your payment complaint '||new.reference||' is now '||replace(new.status,'_',' ')||case when new.resolution is not null then '. '||new.resolution else '.' end,'PAYMENT','/payment-complaint?reference='||new.reference,'payment_complaint',new.id::text,jsonb_build_object('status',new.status,'resolution',new.resolution),'high');
 end if;
 return new;
end; $$;
drop trigger if exists payment_complaint_notify on public.payment_complaints;
drop trigger if exists payment_complaint_events_notify on public.payment_complaints;
create trigger payment_complaint_events_notify after insert or update on public.payment_complaints for each row execute function public.notify_payment_complaint_events();

create or replace function public.notify_campaign_events() returns trigger language plpgsql security definer set search_path=public,private as $$
begin
 if tg_op='UPDATE' and old.status is distinct from new.status then
  perform private.create_notification(new.advertiser_id,'Campaign status updated','"'||new.title||'" is now '||replace(new.status::text,'_',' ')||'.','CAMPAIGN','/advertiser/campaigns/'||new.id::text,'campaign',new.id::text,jsonb_build_object('status',new.status),'normal');
  insert into public.notifications(user_id,title,body,type,href,entity_type,entity_id,metadata,priority)
  select ca.creator_id,'Campaign updated','"'||new.title||'" is now '||replace(new.status::text,'_',' ')||'.','CAMPAIGN','/campaigns/'||new.id::text,'campaign',new.id::text,jsonb_build_object('status',new.status),'normal'
  from public.campaign_applications ca where ca.campaign_id=new.id and ca.status in ('APPROVED','SUBMITTED','COMPLETED');
 end if;
 return new;
end; $$;
drop trigger if exists campaign_status_notify on public.campaigns;
create trigger campaign_status_notify after update on public.campaigns for each row execute function public.notify_campaign_events();

create or replace function public.notify_transaction_events() returns trigger language plpgsql security definer set search_path=public,private as $$
begin
 if old.status is distinct from new.status then
  perform private.create_notification(new.user_id,'Transaction updated',coalesce(new.description,new.type)||' is now '||replace(new.status::text,'_',' ')||'.','TRANSACTION','/earnings?transaction='||new.id::text,'transaction',new.id::text,jsonb_build_object('status',new.status,'reference',new.reference),'normal');
 end if;
 return new;
end; $$;
drop trigger if exists transaction_status_notify on public.transactions;
create trigger transaction_status_notify after update on public.transactions for each row execute function public.notify_transaction_events();
