import {NextResponse} from "next/server";import {backend} from "@/lib/backend";
export async function GET(){try{return NextResponse.json(await backend("/api/dashboard"));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Falha ao carregar painel"},{status:503});}}
