import {useId,useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';

export function BuyerPasswordField({label,name,autoComplete,minLength,placeholder}:{label:string;name:string;autoComplete:string;minLength?:number;placeholder?:string}) {
 const id=useId(),[visible,setVisible]=useState(false);
 return <div className="field buyer-password-field">
  <label htmlFor={id}>{label}</label>
  <div className="buyer-password-control">
   <input id={id} name={name} type={visible?'text':'password'} autoComplete={autoComplete} minLength={minLength} placeholder={placeholder} required/>
   <button type="button" aria-label={(visible?'ซ่อน':'แสดง')+label} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button>
  </div>
 </div>;
}
