export async function backend(path:string,init?:RequestInit){
 const base=process.env.BACKEND_URL,token=process.env.INTERNAL_API_TOKEN;
 if(!base||!token)throw new Error("Backend financeiro não configurado");
 const response=await fetch(new URL(path,base),{...init,headers:{"content-type":"application/json",authorization:`Bearer ${token}`,...(init?.headers??{})},cache:"no-store"});
 const data=await response.json().catch(()=>({error:"Resposta inválida do backend"}));
 if(!response.ok)throw new Error(data.error??"Falha no backend financeiro");
 return data;
}
