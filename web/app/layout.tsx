import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"Fluxo Eventos | Financeiro",description:"Gestão financeira de eventos e despesas internas"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
