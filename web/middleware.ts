import {NextRequest,NextResponse} from "next/server";
const COOKIE="finance_session";
async function valid(value:string|undefined){
 if(!value)return false;const [payload,signature]=value.split(".");const secret=process.env.SESSION_SECRET;
 if(!payload||!signature||!secret||secret.length<32)return false;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
 const decode=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
 if(!await crypto.subtle.verify("HMAC",key,decode(signature),new TextEncoder().encode(payload)))return false;
 try{return JSON.parse(new TextDecoder().decode(decode(payload))).expires>Date.now()}catch{return false}
}
export async function middleware(req:NextRequest){
 const path=req.nextUrl.pathname;
 // A página inicial é uma demonstração pública com dados fictícios.
 if(path==="/"||path==="/login"||path==="/api/login")return NextResponse.next();
 if(!await valid(req.cookies.get(COOKIE)?.value)){
  if(path.startsWith("/api/"))return NextResponse.json({error:"Sessão não autenticada"},{status:401});
  return NextResponse.redirect(new URL("/login",req.url));
 }
 return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
