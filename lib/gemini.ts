import "server-only";
import {parseOutput} from "@/lib/generation";
import {createAdminClient} from "@/lib/supabase/admin";
import type {RuntimeStep} from "@/lib/chain-config";
export async function generateText(prompt:string,field:"description"|"caption",step:RuntimeStep,generation:string,image?:Buffer){
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error("AI_NOT_CONFIGURED");const db=createAdminClient();
 // The request host is fixed. Editable provider metadata can never redirect credentials.
 if(step.model.llm_providers.protocol!=="gemini"||!/^gemini-[a-zA-Z0-9._:-]+$/.test(step.model.api_model))throw new Error("UNSUPPORTED_MODEL");
 const temperature=step.model.supports_temperature&&!step.model.reasoning?step.temperature:null;
 const started=Date.now();const log=await db.from("llm_responses").insert({generation_id:generation,step_id:step.id,model_id:step.model.id,step_position:step.position,step_name:step.name,api_model:step.model.api_model,system_prompt:step.system_prompt,user_prompt:prompt,temperature}).select("id").single();if(log.error)throw new Error("LOG_SAVE_FAILED");
 let status:number|undefined;let raw:string|undefined;let input:number|null=null;let output:number|null=null;
 try{
  const parts:object[]=[{text:prompt}];if(image)parts.push({inlineData:{mimeType:"image/webp",data:image.toString("base64")}});
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(step.model.api_model)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},signal:AbortSignal.timeout(25000),cache:"no-store",body:JSON.stringify({systemInstruction:{parts:[{text:step.system_prompt}]},contents:[{role:"user",parts}],generationConfig:{maxOutputTokens:step.max_output_tokens,responseMimeType:"application/json",...(temperature!==null?{temperature}:{}),responseJsonSchema:{type:"object",properties:{[field]:{type:"string"}},required:[field]}}})});
  status=response.status;
  // Avoid retaining provider error bodies, which may contain infrastructure details.
  if(!response.ok)throw new Error(status===429||status>=500?"AI_BUSY":"AI_FAILED");
  const result=await response.json();const candidate=result.candidates?.[0];
  input=Number.isInteger(result.usageMetadata?.promptTokenCount)?result.usageMetadata.promptTokenCount:null;output=Number.isInteger(result.usageMetadata?.candidatesTokenCount)?result.usageMetadata.candidatesTokenCount:null;
  raw=candidate?.content?.parts?.filter((p:{thought?:boolean})=>!p.thought).map((p:{text?:string})=>p.text||"").join("")||"";
  if(candidate?.finishReason!=="STOP")throw new Error("AI_OUTPUT");let value:string;try{value=parseOutput(raw!,field);}catch{throw new Error("AI_OUTPUT");}
  const saved=await db.from("llm_responses").update({status:"complete",response_text:raw,parsed_output:value,duration_ms:Date.now()-started,http_status:status,input_tokens:input,output_tokens:output}).eq("id",log.data.id);if(saved.error)throw new Error("LOG_SAVE_FAILED");return value;
 }catch(error){const reason=error instanceof Error&&["AI_BUSY","AI_FAILED","AI_OUTPUT","LOG_SAVE_FAILED"].includes(error.message)?error.message:error instanceof Error&&error.name==="TimeoutError"?"AI_TIMEOUT":"AI_FAILED";const saved=await db.from("llm_responses").update({status:"failed",error_code:reason,response_text:raw??null,duration_ms:Date.now()-started,http_status:status??null,input_tokens:input,output_tokens:output}).eq("id",log.data.id);if(saved.error)console.error("llm_response_log_failed",{generation,step:step.id,code:saved.error.code});throw new Error(reason);}
}
