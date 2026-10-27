begin;
-- 2.5 Flash-Lite returned HTTP 404 for this connected project. Never leave a
-- known-unavailable model selected. Preserve the trial record and response log.
update public.prompt_chain_steps set model_id='77000000-0000-4000-8000-000000000002'
where model_id='77000000-0000-4000-8000-000000000003';
update public.llm_models set enabled=true where id='77000000-0000-4000-8000-000000000002';
update public.llm_models set enabled=false where id='77000000-0000-4000-8000-000000000003';
commit;
