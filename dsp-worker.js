importScripts('dsp-core.js');
self.onmessage=({data})=>{try{const result=data.op==='render'?TrishulDSP.render(data.audio,data.edits):TrishulDSP.view(data.audio,data.start,data.end);self.postMessage({id:data.id,result})}catch(e){self.postMessage({id:data.id,error:e.message})}};
