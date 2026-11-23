import {Wllama} from '@wllama/wllama/esm/index.js'
import wasm from '@wllama/wllama/esm/single-thread/wllama.wasm?url'

let loading
async function load(progress) {
  const model=new Wllama({'single-thread/wllama.wasm':wasm})
  progress('Downloading language model…')
  const response=await fetch('https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf')
  if (!response.ok) throw Error('Model host returned HTTP '+response.status)
  const weights=await response.blob()
  progress('Preparing language model…')
  await model.loadModel([weights],{n_threads:1,n_ctx:2048})
  return model
}
export async function infer(messages,progress) {
  progress('Loading language model…')
  loading ??= load(progress).catch(e=>{loading=undefined;throw Error('Model download failed. Check your connection and browser storage, then retry. '+e.message)})
  const model=await loading
  progress('Reading your offer…')
  return model.createChatCompletion(messages,{nPredict:180,useCache:true,sampling:{temp:0}})
}
