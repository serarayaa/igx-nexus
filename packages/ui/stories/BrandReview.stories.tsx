import type { Meta, StoryObj } from "@storybook/react-vite";
import a from "../../../assets/branding/concepts/v03-002/mark-a.svg?raw";
import b from "../../../assets/branding/concepts/v03-002/mark-b.svg?raw";
import c from "../../../assets/branding/concepts/v03-002/mark-c.svg?raw";
import "./foundations.css";

const candidates = [{name:"A · N preciso",svg:a,reason:"Legibilidad primero; menor identidad técnica."},{name:"B · N conectado",svg:b,reason:"Dirección recomendada para revisión; validar nodos a 16 px."},{name:"C · N contenido",svg:c,reason:"Launcher reconocible; mayor masa del marco."}];
function Mark({svg,size}:{svg:string;size:number}) { return <span className="review-mark" style={{width:size,height:size}} aria-hidden="true" dangerouslySetInnerHTML={{__html:svg}} />; }
function BrandReview() {return <main className="igx-foundation-review"><header className="review-header"><div><p className="review-eyebrow">IGX NEXUS · BRAND REVIEW</p><h1>Tres conceptos. Una decisión humana.</h1><p className="review-muted">Assets originales preservados · propuestas aisladas · sin adopción en el shell</p></div></header><div className="review-brand-grid">{candidates.map(candidate => <section key={candidate.name} className="review-brand"><h2>{candidate.name}</h2><div className="review-mark-sizes">{[16,24,32].map(size => <div key={size}><Mark svg={candidate.svg} size={size} /><p className="review-muted">{size} px</p></div>)}</div><div className="review-lockup"><Mark svg={candidate.svg} size={32} /><div><strong>IGX NEXUS</strong><small>by Innergex</small></div></div><p className="review-muted">The Technology Map</p><div className="review-lockup"><Mark svg={candidate.svg} size={24} /><strong>NEXUS</strong></div><p className="review-muted">{candidate.reason}</p><div style={{color:"var(--igx-semantic-color-text-primary)"}}><span className="review-mark" style={{width:32,height:32,color:"inherit"}} aria-hidden="true" dangerouslySetInnerHTML={{__html:candidate.svg}} /><p className="review-muted">Versión monocroma</p></div></section>)}</div><footer className="review-footer">Paleta existente y system UI. Endorsement textual provisional; no recreación del símbolo corporativo.</footer></main>}
const meta={title:"Foundations/Brand Review",component:BrandReview,parameters:{layout:"fullscreen"}} satisfies Meta<typeof BrandReview>;
export default meta;type Story=StoryObj<typeof meta>;
export const Light:Story={globals:{theme:"light",density:"comfortable"}};
export const Dark:Story={globals:{theme:"dark",density:"compact"}};
