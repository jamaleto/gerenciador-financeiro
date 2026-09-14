import {NextRequest,NextResponse} from "next/server";import {backend} from "@/lib/backend";
export async function GET(){try{return NextResponse.json(await backend("/api/entries"));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Falha ao carregar lançamentos"},{status:503});}}
export async function POST(req:NextRequest){try{return NextResponse.json(await backend("/api/entries",{method:"POST",body:JSON.stringify(await req.json())}),{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Falha ao salvar lançamento"},{status:422});}}
