import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {chooseChain,type RuntimeChain,type RuntimeStep} from "./chain-config";
export async function loadChain(topic:string){const db=createAdminClient();const [mixResult,termsResult,examplesResult]=await Promise.all([
 db.from("prompt_chain_mix").select("weight,chain:prompt_chains(id,name,enabled,steps:prompt_chain_steps(id,position,name,output_field,system_prompt,prompt_template,temperature,max_output_tokens,model:llm_models(id,name,api_model,reasoning,supports_temperature,enabled,llm_providers(id,protocol,enabled))))").eq("enabled",true).gt("weight",0),
 db.from("terms").select("term,definition,example").or(`topic.eq.${topic},topic.is.null`).order("created_at").order("id").limit(8),
 db.from("ai_generation_examples").select("id,image_description,caption").eq("enabled",true).eq("topic",topic).order("created_at").order("id").limit(4)
 ]);if(mixResult.error||termsResult.error||examplesResult.error)throw new Error("CHAIN_CONFIG_UNAVAILABLE");
 const chains:RuntimeChain[]=[];for(const raw of mixResult.data){const c=raw.chain as unknown as {id:string;name:string;enabled:boolean;steps:RuntimeStep[]}|null;if(c?.enabled)chains.push({id:c.id,name:c.name,weight:raw.weight,steps:c.steps.sort((a,b)=>a.position-b.position)});}
 const chain=chooseChain(chains);return {chain,terms:termsResult.data,examples:examplesResult.data};}
