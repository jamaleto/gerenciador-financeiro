"use client";
import {useMemo,useState} from "react";
import {BarChart3,Building2,CalendarDays,CircleDollarSign,Landmark,LayoutDashboard,Menu,Plus,Search,Tags,Users,WalletCards,X} from "lucide-react";

type Entry={id:number;type:"Receita"|"Despesa";description:string;party:string;project:string;category:string;due:string;value:number;status:string};
const initial:Entry[]=[
{id:1,type:"Receita",description:"Parcela do contrato de produção",party:"Associação Cultural",project:"Festival do Japão 2026",category:"Contratos de produção",due:"18/09/2026",value:48500,status:"Pendente"},
{id:2,type:"Despesa",description:"Locação de painel de LED",party:"Visual Tech Eventos",project:"Festival do Japão 2026",category:"Audiovisual e LED",due:"16/09/2026",value:12800,status:"Pago"},
{id:3,type:"Despesa",description:"Equipe de recepção",party:"Equipe operacional",project:"Congresso Mulheres 2026",category:"Equipe e freelancers",due:"15/09/2026",value:3600,status:"Pendente"},
{id:4,type:"Receita",description:"Sinal do contrato",party:"Cliente Norte",project:"Inauguração Cliente Norte",category:"Contratos de produção",due:"10/09/2026",value:22000,status:"Recebido"},
{id:5,type:"Despesa",description:"Hospedagem VPS e sistemas",party:"Fornecedor de tecnologia",project:"Administração interna",category:"Softwares e tecnologia",due:"08/09/2026",value:890,status:"Pago"}];
const money=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const nav=[
["dashboard","Visão geral",LayoutDashboard],["finance","Receitas e despesas",WalletCards],["projects","Eventos e projetos",CalendarDays],
["people","Clientes e fornecedores",Users],["plan","Plano de contas",Tags],["reports","Relatórios",BarChart3],
["internal","Despesas internas",Building2],["banks","Contas bancárias",Landmark]
] as const;

export default function Home(){
 const [section,setSection]=useState("dashboard"),[mobile,setMobile]=useState(false),[entries,setEntries]=useState(initial),[query,setQuery]=useState(""),[modal,setModal]=useState(false);
 const income=entries.filter(e=>e.type==="Receita").reduce((s,e)=>s+e.value,0),expense=entries.filter(e=>e.type==="Despesa").reduce((s,e)=>s+e.value,0);
 const list=useMemo(()=>entries.filter(e=>Object.values(e).join(" ").toLowerCase().includes(query.toLowerCase())),[entries,query]);
 const go=(id:string)=>{setSection(id);setMobile(false)};
 const add=(form:FormData)=>{setEntries(v=>[...v,{id:Date.now(),type:form.get("type") as Entry["type"],description:String(form.get("description")),party:String(form.get("party")),project:String(form.get("project")),category:String(form.get("category")),due:String(form.get("due")),value:Number(form.get("value")),status:"Pendente"}]);setModal(false);setSection("finance")};
 const titles:Record<string,string>={dashboard:"Visão geral",finance:"Receitas e despesas",projects:"Eventos e projetos",people:"Clientes e fornecedores",plan:"Plano de contas",reports:"Relatórios financeiros",internal:"Despesas internas",banks:"Contas bancárias"};
 return <div className="shell">
  <aside className={mobile?"sidebar open":"sidebar"}><div className="brand"><i>F</i><span><b>Fluxo</b><small>EVENTOS</small></span></div><button className="close" onClick={()=>setMobile(false)}><X/></button>
   <nav>{nav.map(([id,label,Icon])=><a key={id} className={section===id?"active":""} onClick={()=>go(id)}><Icon/>{label}</a>)}</nav>
   <div className="bottom"><div className="profile"><i>TG</i><span><b>Modo demonstração</b><small>SEM LOGIN • DADOS FICTÍCIOS</small></span></div></div>
  </aside>
  <main className="content"><header><button className="hamb" onClick={()=>setMobile(true)}><Menu/></button><div><p>Gerenciador financeiro</p><h1>{titles[section]}</h1></div><button className="primary" onClick={()=>setModal(true)}><Plus/>Novo lançamento</button></header>
   <section className="notice"><b>Teste completo sem senha</b><span>Todos os módulos estão liberados e usam somente informações fictícias desta demonstração.</span></section>
   {(section==="dashboard"||section==="finance"||section==="reports")&&<section className="cards">
    <article className="featured"><span>Resultado previsto</span><strong>{money(income-expense)}</strong><small>Receitas menos despesas</small></article>
    <article><span>Total de receitas</span><strong className="green">{money(income)}</strong><small>Contratos e entradas</small></article>
    <article><span>Total de despesas</span><strong className="red">{money(expense)}</strong><small>Eventos e operação interna</small></article>
    <article><span>Valores pendentes</span><strong className="amber">{money(entries.filter(e=>e.status==="Pendente").reduce((s,e)=>s+e.value,0))}</strong><small>Exigem acompanhamento</small></article>
   </section>}
   {section==="dashboard"&&<><section className="split"><article><div className="section-title"><div><p>Visão da empresa</p><h2>Previsto × realizado</h2></div><CircleDollarSign/></div><div className="bars"><label>Receitas realizadas <b>{money(22000)}</b><span><i style={{width:"31%"}}/></span></label><label>Despesas pagas <b>{money(13690)}</b><span className="expense"><i style={{width:"72%"}}/></span></label></div></article><article><p>Organização financeira</p><h2>Resultados separados</h2><div className="mini"><div><b>Eventos e projetos</b><span>Custos, receitas e margem por evento.</span></div><div><b>Operação interna</b><span>Escritório, funcionários e tecnologia.</span></div></div></article></section><EntryTable list={list} query={query} setQuery={setQuery}/></>}
   {section==="finance"&&<EntryTable list={list} query={query} setQuery={setQuery} onDelete={id=>setEntries(v=>v.filter(e=>e.id!==id))}/>}
   {section==="projects"&&<Grid items={[["Festival do Japão 2026","Receita R$ 48.500 • Despesa R$ 12.800","Em produção"],["Congresso Mulheres 2026","Receita R$ 0 • Despesa R$ 3.600","Planejamento"],["Inauguração Cliente Norte","Receita R$ 22.000 • Despesa R$ 0","Concluído"],["Administração interna","Custos fixos e estrutura da empresa","Ativo"]]}/>}
   {section==="people"&&<Grid items={[["Associação Cultural","Cliente • Festival do Japão","Ativo"],["Cliente Norte","Cliente • Inauguração","Ativo"],["Visual Tech Eventos","Fornecedor • Audiovisual","Ativo"],["Equipe operacional","Fornecedor • Mão de obra","Ativo"]]}/>}
   {section==="plan"&&<Grid items={[["Receitas de eventos","Contratos • Patrocínios • Inscrições","Receita"],["Estrutura e equipamentos","Palco • Som • Luz • LED","Despesa"],["Equipe e freelancers","Produção • Recepção • Segurança","Despesa"],["Despesas administrativas","Aluguel • Sistemas • Contabilidade","Despesa"]]}/>}
   {section==="internal"&&<Grid items={[["Escritório","Aluguel, energia, internet e manutenção","R$ 4.850/mês"],["Funcionários","Salários, encargos e benefícios","R$ 18.400/mês"],["Tecnologia","Softwares, VPS e equipamentos","R$ 2.390/mês"],["Veículos","Combustível, seguro e manutenção","R$ 3.200/mês"]]}/>}
   {section==="banks"&&<Grid items={[["Conta corrente principal","Banco demonstração • Ag. 0001","R$ 54.320,00"],["Conta de eventos","Banco demonstração • Ag. 0001","R$ 21.500,00"],["Caixa","Dinheiro disponível","R$ 1.850,00"],["Cartão empresarial","Fatura atual","R$ 4.280,00"]]}/>}
   {section==="reports"&&<><section className="split reports"><article><p>Resultado por centro</p><h2>Eventos × operação interna</h2><div className="report-row"><span>Eventos e projetos</span><b className="green">{money(54100)}</b></div><div className="report-row"><span>Administração interna</span><b className="red">− {money(890)}</b></div></article><article><p>Indicador</p><h2>Margem prevista</h2><strong className="big green">{((income-expense)/income*100).toFixed(1)}%</strong><small>sobre as receitas cadastradas</small></article></section><EntryTable list={list} query={query} setQuery={setQuery}/></>}
  </main>
  {modal&&<div className="overlay"><form className="modal" action={add}><div className="modal-head"><div><p>Novo registro</p><h2>Lançamento financeiro</h2></div><button type="button" onClick={()=>setModal(false)}><X/></button></div><div className="form-grid"><label>Tipo<select name="type"><option>Receita</option><option>Despesa</option></select></label><label>Valor<input name="value" type="number" step="0.01" required/></label><label className="wide">Descrição<input name="description" required/></label><label>Cliente/fornecedor<input name="party" required/></label><label>Evento/setor<input name="project" required/></label><label>Categoria<input name="category" required/></label><label>Vencimento<input name="due" type="date" required/></label></div><div className="modal-actions"><button type="button" onClick={()=>setModal(false)}>Cancelar</button><button className="primary">Salvar teste</button></div></form></div>}
 </div>
}
function Grid({items}:{items:string[][]}){return <section className="module-grid">{items.map((x,i)=><article key={i}><div className="module-icon">{i+1}</div><div><h2>{x[0]}</h2><p>{x[1]}</p></div><b>{x[2]}</b><button>Visualizar</button></article>)}</section>}
function EntryTable({list,query,setQuery,onDelete}:{list:Entry[];query:string;setQuery:(s:string)=>void;onDelete?:(id:number)=>void}){return <section className="work"><div className="tools"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar lançamento, evento, cliente ou categoria"/></label></div><div className="table"><table><thead><tr><th>Vencimento</th><th>Lançamento</th><th>Evento / setor</th><th>Situação</th><th>Valor</th>{onDelete&&<th>Ação</th>}</tr></thead><tbody>{list.map(e=><tr key={e.id}><td>{e.due}</td><td><b>{e.description}</b><small>{e.party}</small></td><td><em>{e.project}</em><small>{e.category}</small></td><td><span className="status">{e.status}</span></td><td className={e.type==="Receita"?"green value":"red value"}>{e.type==="Receita"?"+ ":"− "}{money(e.value)}</td>{onDelete&&<td><button className="delete" onClick={()=>onDelete(e.id)}>Excluir</button></td>}</tr>)}</tbody></table>{!list.length&&<div className="empty">Nenhum lançamento encontrado.</div>}</div></section>}
