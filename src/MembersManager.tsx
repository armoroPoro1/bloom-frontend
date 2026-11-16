import {useState} from 'react';
import {ArrowDownToLine, Check, Eye, Search, ShieldCheck, Store, UserRound, XCircle} from 'lucide-react';
import {useStore} from './store';
import {Empty, Modal} from './components';
import {money} from './data';
import {downloadManagementCSV, orderDay, summarizeSales} from './managementReports';
import type {User} from './types';

const roleLabel = (role: User['role']) => role === 'admin' ? 'ผู้ดูแลระบบ' : role === 'seller' ? 'ผู้ขาย' : 'ลูกค้า';

export default function MembersManager() {
  const {state, user, setUserBlocked} = useStore();
  const [query, setQuery] = useState(''), [role, setRole] = useState('all'), [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null), [changeId, setChangeId] = useState<string | null>(null);
  const list = state.users.filter(member => (role === 'all' || member.role === role)
    && (status === 'all' || (status === 'blocked' ? member.blocked : !member.blocked))
    && [member.name, member.email, member.phone].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected = state.users.find(member => member.id === selectedId);
  const changed = state.users.find(member => member.id === changeId);
  const selectedShop = state.shops.find(shop => shop.id === selected?.shopId);
  const selectedOrders = state.orders.filter(order => order.buyerId === selected?.id);
  const selectedSummary = summarizeSales(selectedOrders);
  const mayBlock = (member: User) => member.id !== user?.id && member.role !== 'admin';
  const exportMembers = () => downloadManagementCSV('bloom-members-' + orderDay(new Date()) + '.csv',
    ['ชื่อ', 'อีเมล', 'โทรศัพท์', 'ประเภท', 'สถานะ', 'ร้านค้า'], list.map(member => [member.name, member.email, member.phone, roleLabel(member.role), member.blocked ? 'ระงับบัญชี' : 'ใช้งานได้', state.shops.find(shop => shop.id === member.shopId)?.name || '']));

  return <><section className="dash-panel">
    <div className="dash-toolbar dash-member-toolbar">
      <div className="dash-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ค้นหาชื่อ อีเมล หรือโทรศัพท์" aria-label="ค้นหาสมาชิก"/></div>
      <select aria-label="ประเภทสมาชิก" value={role} onChange={event => setRole(event.target.value)}><option value="all">ทุกประเภท</option><option value="user">ลูกค้า</option><option value="seller">ผู้ขาย</option><option value="admin">ผู้ดูแลระบบ</option></select>
      <select aria-label="สถานะสมาชิก" value={status} onChange={event => setStatus(event.target.value)}><option value="all">ทุกสถานะ</option><option value="active">ใช้งานได้</option><option value="blocked">ระงับบัญชี</option></select>
      <button className="dash-btn dash-btn-soft" onClick={exportMembers} disabled={!list.length}><ArrowDownToLine size={16}/>ดาวน์โหลด CSV</button>
    </div>
    <div className="dash-table-wrap"><table className="dash-table"><thead><tr><th>สมาชิก</th><th>ประเภท</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{list.map(member => <tr key={member.id}>
      <td><button className="dash-member-link" onClick={() => setSelectedId(member.id)}><span className="dash-member-cell"><span>{member.name.charAt(0)}</span><span className="dash-member-copy"><strong>{member.name}</strong><small>{member.email}</small></span></span></button></td>
      <td>{roleLabel(member.role)}</td><td><span className={'dash-pill ' + (member.blocked ? 'gray' : 'green')}>{member.blocked ? 'ระงับบัญชี' : 'ใช้งานได้'}</span></td>
      <td><div className="dash-member-actions"><button className="dash-btn dash-btn-small dash-btn-soft" onClick={() => setSelectedId(member.id)} aria-label={'ดูข้อมูลสมาชิก ' + member.name}><Eye size={14}/>รายละเอียด</button>{mayBlock(member) && <button className="dash-btn dash-btn-small dash-btn-soft" onClick={() => setChangeId(member.id)}>{member.blocked ? 'เปิดใช้งาน' : 'ระงับบัญชี'}</button>}</div></td>
    </tr>)}</tbody></table></div>
    {!list.length && <Empty title="ไม่พบสมาชิกที่ตรงกับตัวกรอง" description="ลองเปลี่ยนคำค้นหา ประเภท หรือสถานะสมาชิก" action={<button className="dash-btn dash-btn-soft" onClick={() => {setQuery(''); setRole('all'); setStatus('all');}}>ล้างตัวกรอง</button>}/>}
    <div className="dash-table-footer">แสดง {list.length} จาก {state.users.length} สมาชิก</div>
  </section>
  {selected && <Modal title="รายละเอียดสมาชิก" onClose={() => setSelectedId(null)}><div className="dash-member-detail">
    <div className="dash-settings-heading"><span className="dash-settings-icon">{selected.role === 'admin' ? <ShieldCheck size={26}/> : selected.role === 'seller' ? <Store size={26}/> : <UserRound size={26}/>}</span><div><h2>{selected.name}</h2><p>{roleLabel(selected.role)} · {selected.blocked ? 'ระงับบัญชี' : 'ใช้งานได้'}</p></div></div>
    <dl><div><dt>อีเมล</dt><dd>{selected.email}</dd></div><div><dt>โทรศัพท์</dt><dd>{selected.phone || 'ยังไม่ระบุ'}</dd></div><div><dt>ที่อยู่ในโปรไฟล์</dt><dd>{selected.address || 'ยังไม่ระบุ'}</dd></div>{selectedShop && <div><dt>ร้านค้า</dt><dd>{selectedShop.name}</dd></div>}<div><dt>คำสั่งซื้อของสมาชิก</dt><dd>{selectedOrders.length} รายการ</dd></div><div><dt>ยอดซื้อที่ชำระแล้ว</dt><dd>{money(selectedSummary.paidTotal)}</dd></div></dl>
    <p className="dash-muted">ยอดซื้อรวมค่าจัดส่ง เฉพาะคำสั่งซื้อที่ชำระแล้วและยังไม่ถูกยกเลิก</p>
    <div className="dash-modal-actions"><button className="dash-btn dash-btn-soft" onClick={() => setSelectedId(null)}>ปิด</button>{mayBlock(selected) && <button className={'dash-btn ' + (selected.blocked ? 'dash-btn-primary' : 'dash-btn-danger')} onClick={() => setChangeId(selected.id)}>{selected.blocked ? <Check size={16}/> : <XCircle size={16}/>} {selected.blocked ? 'เปิดใช้งานบัญชี' : 'ระงับบัญชี'}</button>}</div>
  </div></Modal>}
  {changed && <Modal title={changed.blocked ? 'เปิดใช้งานสมาชิกอีกครั้ง' : 'ยืนยันการระงับสมาชิก'} onClose={() => setChangeId(null)}><div className="dash-confirm">
    <p><strong>{changed.name}</strong><br/>{changed.email}</p><p className="dash-muted">{changed.blocked ? 'สมาชิกจะกลับเข้าสู่ระบบและใช้งานบัญชีได้อีกครั้ง' : 'สมาชิกจะเข้าสู่ระบบและทำรายการใหม่ไม่ได้ ประวัติคำสั่งซื้อยังอยู่ และคุณสามารถเปิดใช้งานบัญชีอีกครั้งได้'}</p>
    <div className="dash-modal-actions"><button className="dash-btn dash-btn-soft" onClick={() => setChangeId(null)}>กลับไป</button><button className={'dash-btn ' + (changed.blocked ? 'dash-btn-primary' : 'dash-btn-danger')} onClick={async () => {if (await setUserBlocked(changed.id, !changed.blocked)) setChangeId(null);}}>{changed.blocked ? 'ยืนยันเปิดใช้งาน' : 'ยืนยันระงับบัญชี'}</button></div>
  </div></Modal>}
  </>;
}
