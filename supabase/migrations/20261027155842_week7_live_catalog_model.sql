begin;
-- Selected from this project's authenticated live /v1beta/models response.
insert into public.llm_models(id,provider_id,name,api_model,reasoning,supports_temperature,enabled)
values('77000000-0000-4000-8000-000000000004','77000000-0000-4000-8000-000000000001','Gemini 3.5 Flash-Lite','gemini-3.5-flash-lite',true,false,true);
update public.prompt_chain_steps set model_id='77000000-0000-4000-8000-000000000004',max_output_tokens=2048
where model_id='77000000-0000-4000-8000-000000000002';
update public.llm_models set enabled=false where id in ('77000000-0000-4000-8000-000000000002','77000000-0000-4000-8000-000000000003');
commit;
