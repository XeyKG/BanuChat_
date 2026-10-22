import assert from 'node:assert/strict';
import test from 'node:test';
import {sanitizeProviderError,tracedGeneratorFetch,type ProviderEvent} from './ccd-generation-trace.mjs';
import {GeneratorClientError,type GeneratorConfig} from '../../backend/api/src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../../backend/api/src/generation/ollama-generator-client.js';

test('provider errors retain diagnostic context but redact identifiers, credentials and paths',()=>{
  const safe=sanitizeProviderError(JSON.stringify({error:'input length 8000 exceeds context length 4096; token=abc email=a@example.test U123456789 C:\\Users\\private\\file https://private.test/path'}));
  assert.match(safe,/input length 8000 exceeds context length 4096/);
  assert.doesNotMatch(safe,/abc|a@example|U123|private/);
  assert.match(safe,/redacted/);
  assert.doesNotMatch(sanitizeProviderError('<html>private</html>'),/private/);
});

test('evaluation transport observes the real status/body without consuming or replacing the response',async()=>{
  const events:ProviderEvent[]=[];const signal=AbortSignal.timeout(30000);
  const response=new Response(JSON.stringify({error:'input length exceeds model context length'}),{status:400});
  const observed=tracedGeneratorFetch(events,async(_url,init)=>{assert.equal(init?.signal,signal);return response;});
  assert.equal(await observed('http://127.0.0.1:11434/api/chat',{signal}),response);
  assert.equal(events[0]?.status,400);assert.match(events[0]!.provider_error!,/context length/);
  assert.deepEqual(await response.json(),{error:'input length exceeds model context length'});
});

test('an aborted fetch remains an error and retains the original abort signal',async()=>{
  const events:ProviderEvent[]=[];const controller=new AbortController();controller.abort(new DOMException('','TimeoutError'));
  const original=new DOMException('aborted','TimeoutError');
  const observed=tracedGeneratorFetch(events,async()=>{throw original;});
  await assert.rejects(observed('http://127.0.0.1:11434/api/chat',{signal:controller.signal}),e=>e===original);
  assert.equal(events[0]?.aborted,true);assert.equal(events[0]?.exception_name,'TimeoutError');
  assert.equal(events[0]?.abort_reason_name,'TimeoutError');
});

test('the unchanged production client distinguishes provider rejection, malformed JSON and incomplete generation',async()=>{
  const config:GeneratorConfig={provider:'ollama',model:'qwen3:4b-instruct',model_revision:'a'.repeat(64),runtime_version:'0.35.0',recipe:{think:false,stream:false,options:{temperature:0,num_predict:256},keep_alive:'5m'}};
  for(const item of [
    {response:()=>new Response(JSON.stringify({error:'input length exceeds model context length'}),{status:400}),reason:'invalid_generator_response',status:400},
    {response:()=>new Response('invalid JSON',{status:200}),reason:'invalid_generator_response',status:200},
    {response:()=>new Response(JSON.stringify({message:{content:'answer'},done:true,done_reason:'length'})),reason:'generator_response_incomplete',status:200},
  ]){
    const events:ProviderEvent[]=[];
    const transport:typeof fetch=async url=>{
      const p=new URL(String(url)).pathname;
      if(p==='/api/version')return new Response(JSON.stringify({version:'0.35.0'}));
      if(p==='/api/tags')return new Response(JSON.stringify({models:[{name:config.model,digest:config.model_revision}]}));
      if(p==='/api/show')return new Response(JSON.stringify({capabilities:['completion']}));
      return item.response();
    };
    const client=new OllamaGeneratorClient('http://127.0.0.1:11434',30000,tracedGeneratorFetch(events,transport));
    await assert.rejects(client.generate({system_prompt:'test',user_prompt:'test'},config),e=>e instanceof GeneratorClientError&&e.reason===item.reason);
    assert.equal(events.find(e=>e.path==='/api/chat')?.status,item.status);
  }
});

test('verification and generation durations are separated without recording generated text',async()=>{
  const events:ProviderEvent[]=[];
  const observed=tracedGeneratorFetch(events,async()=>new Response(JSON.stringify({done:true,done_reason:'stop',message:{content:'private text'},eval_count:3,prompt_eval_count:8,load_duration:1000000})));
  await observed('http://127.0.0.1:11434/api/version');await observed('http://127.0.0.1:11434/api/chat');await observed('http://127.0.0.1:11434/api/tags');
  assert.deepEqual(events.map(e=>e.stage),['verification_before','generation','verification_after']);
  assert.equal(events[1]?.content_chars,12);assert.equal(events[1]?.load_duration_ms,1);
  assert.doesNotMatch(JSON.stringify(events),/private text/);
});
