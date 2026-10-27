begin;
-- The live 3.1 provider returned repeated HTTP 503s during Week 7 verification.
-- Keep its catalog record and historical request snapshots, and use another
-- supported Gemini model through the same fixed-host adapter and server key.
insert into public.llm_models(id,provider_id,name,api_model,reasoning,supports_temperature,enabled)
values('77000000-0000-4000-8000-000000000003','77000000-0000-4000-8000-000000000001','Gemini 2.5 Flash-Lite','gemini-2.5-flash-lite',true,false,true);
update public.prompt_chain_steps set model_id='77000000-0000-4000-8000-000000000003'
where model_id='77000000-0000-4000-8000-000000000002';
update public.llm_models set enabled=false where id='77000000-0000-4000-8000-000000000002';
commit;
