import {createHmac,timingSafeEqual} from "node:crypto";
export const COOKIE_NAME="finance_session";
const secret=()=>{const v=process.env.SESSION_SECRET;if(!v||v.length<32)throw new Error("SESSION_SECRET inválido");return v};
export function createSession(){
 const expires=Date.now()+8*60*60*1000,payload=Buffer.from(JSON.stringify({expires})).toString("base64url");
 const signature=createHmac("sha256",secret()).update(payload).digest("base64url");
 return `${payload}.${signature}`;
}
export function validSession(value?:string){
 if(!value)return false;const [payload,signature]=value.split(".");if(!payload||!signature)return false;
 const expected=createHmac("sha256",secret()).update(payload).digest("base64url");
 const a=Buffer.from(signature),b=Buffer.from(expected);if(a.length!==b.length||!timingSafeEqual(a,b))return false;
 try{return JSON.parse(Buffer.from(payload,"base64url").toString()).expires>Date.now()}catch{return false}
}
