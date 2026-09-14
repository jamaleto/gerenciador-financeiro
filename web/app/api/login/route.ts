import {NextRequest,NextResponse} from "next/server";import {timingSafeEqual} from "node:crypto";import {createSession,COOKIE_NAME} from "@/lib/session";
export async function POST(req:NextRequest){
 const {password}=await req.json();const configured=process.env.APP_ACCESS_PASSWORD;
 if(!configured||configured.length<10)return NextResponse.json({error:"Acesso ainda não configurado"},{status:503});
 const a=Buffer.from(String(password??"")),b=Buffer.from(configured);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"Senha incorreta"},{status:401});
 const res=NextResponse.json({ok:true});res.cookies.set(COOKIE_NAME,createSession(),{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:28800});return res;
}
