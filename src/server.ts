import express,{NextFunction,Request,Response} from "express";
import cors from "cors";
import helmet from "helmet";
import {timingSafeEqual} from "node:crypto";
import {z} from "zod";
import {db,withTransaction} from "./db.js";

const apiToken=process.env.INTERNAL_API_TOKEN;
const organizationId=process.env.ORGANIZATION_ID;
if(!apiToken||apiToken.length<32)throw new Error("INTERNAL_API_TOKEN deve ter ao menos 32 caracteres");
if(!organizationId||!z.string().uuid().safeParse(organizationId).success)throw new Error("ORGANIZATION_ID inválido");

const app=express();
app.use(helmet(),cors({origin:process.env.CORS_ORIGIN?.split(",")??false}),express.json({limit:"1mb"}));
function authorized(value:string|undefined){
 const token=value?.startsWith("Bearer ")?value.slice(7):"";
 const a=Buffer.from(token),b=Buffer.from(apiToken!);
 return a.length===b.length&&timingSafeEqual(a,b);
}
app.use("/api",(req,res,next)=>{
 if(req.path==="/health")return next();
 if(!authorized(req.header("authorization")))return res.status(401).json({error:"Não autorizado"});
 next();
});
app.get("/api/health",async(_req,res)=>{try{await db.query("SELECT 1");res.json({status:"ok"});}catch{res.status(503).json({status:"database_unavailable"});}});

app.get("/api/projects",async(_req,res,next)=>{try{
 const {rows}=await db.query(`SELECT p.*,COALESCE(v.income_cents,0) income_cents,COALESCE(v.expense_cents,0) expense_cents,COALESCE(v.result_cents,0) result_cents
 FROM projects p LEFT JOIN vw_project_financial_result v ON v.project_id=p.id
 WHERE p.organization_id=$1 ORDER BY p.start_date DESC NULLS LAST,p.name`,[organizationId]);res.json(rows);
}catch(e){next(e);}});
app.get("/api/parties",async(req,res,next)=>{try{
 const type=typeof req.query.type==="string"?req.query.type:null;
 const {rows}=await db.query("SELECT * FROM parties WHERE organization_id=$1 AND active AND ($2::text IS NULL OR type=$2) ORDER BY name",[organizationId,type]);res.json(rows);
}catch(e){next(e);}});
app.get("/api/chart-accounts",async(_req,res,next)=>{try{const {rows}=await db.query("SELECT * FROM chart_accounts WHERE organization_id=$1 AND active ORDER BY code",[organizationId]);res.json(rows);}catch(e){next(e);}});
app.get("/api/cost-centers",async(_req,res,next)=>{try{const {rows}=await db.query("SELECT * FROM cost_centers WHERE organization_id=$1 AND active ORDER BY scope,name",[organizationId]);res.json(rows);}catch(e){next(e);}});
app.get("/api/financial-accounts",async(_req,res,next)=>{try{const {rows}=await db.query("SELECT * FROM financial_accounts WHERE organization_id=$1 AND active ORDER BY name",[organizationId]);res.json(rows);}catch(e){next(e);}});

const entry=z.object({projectId:z.string().uuid().optional(),costCenterId:z.string().uuid().optional(),chartAccountId:z.string().uuid(),partyId:z.string().uuid().optional(),type:z.enum(["INCOME","EXPENSE"]),description:z.string().min(2).max(240),issueDate:z.string().date(),competenceDate:z.string().date(),totalCents:z.number().int().positive(),notes:z.string().max(5000).optional(),installments:z.array(z.object({dueDate:z.string().date(),amountCents:z.number().int().positive()})).min(1)}).superRefine((v,c)=>{if(v.installments.reduce((s,i)=>s+i.amountCents,0)!==v.totalCents)c.addIssue({code:"custom",message:"Soma das parcelas diferente do total",path:["installments"]});});
app.post("/api/entries",async(req,res,next)=>{try{
 const e=entry.parse(req.body);
 const result=await withTransaction(async client=>{
  const refs=await client.query(`SELECT
   EXISTS(SELECT 1 FROM chart_accounts WHERE id=$1 AND organization_id=$4) chart_ok,
   ($2::uuid IS NULL OR EXISTS(SELECT 1 FROM projects WHERE id=$2 AND organization_id=$4)) project_ok,
   ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM parties WHERE id=$3 AND organization_id=$4)) party_ok`,[e.chartAccountId,e.projectId??null,e.partyId??null,organizationId]);
  if(!refs.rows[0].chart_ok||!refs.rows[0].project_ok||!refs.rows[0].party_ok)throw Object.assign(new Error("Referência inválida"),{status:422});
  const {rows}=await client.query(`INSERT INTO financial_entries(organization_id,project_id,cost_center_id,chart_account_id,party_id,type,description,issue_date,competence_date,total_cents,notes)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[organizationId,e.projectId??null,e.costCenterId??null,e.chartAccountId,e.partyId??null,e.type,e.description,e.issueDate,e.competenceDate,e.totalCents,e.notes??null]);
  for(const [index,i] of e.installments.entries())await client.query("INSERT INTO entry_installments(entry_id,installment_number,due_date,amount_cents) VALUES($1,$2,$3,$4)",[rows[0].id,index+1,i.dueDate,i.amountCents]);
  return rows[0];
 });res.status(201).json(result);
}catch(e){next(e);}});
app.get("/api/entries",async(_req,res,next)=>{try{
 const {rows}=await db.query(`SELECT e.*,p.name party_name,pr.name project_name,ca.name category_name,MIN(i.due_date) next_due_date,SUM(i.amount_cents-i.paid_cents) outstanding_cents
 FROM financial_entries e LEFT JOIN parties p ON p.id=e.party_id LEFT JOIN projects pr ON pr.id=e.project_id
 JOIN chart_accounts ca ON ca.id=e.chart_account_id JOIN entry_installments i ON i.entry_id=e.id
 WHERE e.organization_id=$1 GROUP BY e.id,p.name,pr.name,ca.name ORDER BY next_due_date DESC`,[organizationId]);res.json(rows);
}catch(e){next(e);}});

app.get("/api/dashboard",async(_req,res,next)=>{try{
 const {rows}=await db.query(`SELECT COALESCE(SUM(CASE WHEN e.type='INCOME' THEN i.amount_cents ELSE 0 END),0) income_planned_cents,
 COALESCE(SUM(CASE WHEN e.type='EXPENSE' THEN i.amount_cents ELSE 0 END),0) expense_planned_cents,
 COALESCE(SUM(CASE WHEN e.type='INCOME' THEN i.paid_cents ELSE 0 END),0) income_realized_cents,
 COALESCE(SUM(CASE WHEN e.type='EXPENSE' THEN i.paid_cents ELSE 0 END),0) expense_realized_cents,
 COALESCE(SUM(CASE WHEN i.status IN('OPEN','PARTIAL','OVERDUE') AND i.due_date<CURRENT_DATE THEN i.amount_cents-i.paid_cents ELSE 0 END),0) overdue_cents
 FROM financial_entries e JOIN entry_installments i ON i.entry_id=e.id WHERE e.organization_id=$1 AND e.status<>'CANCELLED'`,[organizationId]);res.json(rows[0]);
}catch(e){next(e);}});
app.get("/api/reports/projects",async(_req,res,next)=>{try{const {rows}=await db.query("SELECT * FROM vw_project_financial_result WHERE organization_id=$1 ORDER BY result_cents DESC",[organizationId]);res.json(rows);}catch(e){next(e);}});
app.get("/api/reports/cash-flow",async(_req,res,next)=>{try{const {rows}=await db.query("SELECT * FROM vw_monthly_cash_flow WHERE organization_id=$1 ORDER BY month",[organizationId]);res.json(rows);}catch(e){next(e);}});

app.use((error:any,_req:Request,res:Response,_next:NextFunction)=>{if(error instanceof z.ZodError)return res.status(422).json({error:"Dados inválidos",details:error.flatten()});console.error(error);res.status(error.status??500).json({error:error.message??"Erro interno"});});
app.listen(Number(process.env.PORT??3001),()=>console.log("API financeira iniciada"));
