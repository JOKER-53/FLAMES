import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
export class Diagnostics {
 private started=Date.now(); private requests=0; private failures=0; private rateLimits:Record<string,number>={};
 constructor(private log:(entry:Record<string,unknown>)=>void=entry=>console.log(JSON.stringify(entry))){}
 middleware:RequestHandler=(req,res,next)=>{
  const requestId=randomUUID(),start=performance.now();res.locals.requestId=requestId;res.setHeader("X-Request-ID",requestId);
  const json=res.json.bind(res);res.json=((body:any)=>json(res.statusCode>=400&&body&&typeof body==="object"&&!Array.isArray(body)?{...body,requestId}:body)) as typeof res.json;
  res.once("finish",()=>{
   this.requests++;if(res.statusCode>=500)this.failures++;
   const status=res.statusCode;
   if(status===429){const bucket=res.locals.rateLimit==="account"?"account":"tutor";this.rateLimits[bucket]=(this.rateLimits[bucket]??0)+1;}
   if(status>=400||process.env.LOG_HTTP_REQUESTS==="true")this.log({event:status===429?"rate_limit":status>=500?"api_error":"http_request",requestId,method:req.method,route:typeof req.route?.path==="string"?req.route.path:"unmatched",status,durationMs:Math.round(performance.now()-start),...(status===429?{retryAfter:res.getHeader("Retry-After")}:{}),...(status>=500?{category:res.locals.errorCategory??"upstream"}:{})});
  });next();
 };
 snapshot(){return{startedAt:this.started,uptimeSeconds:Math.floor((Date.now()-this.started)/1000),requests:this.requests,serverErrors:this.failures,rateLimits:{...this.rateLimits}};}
}
