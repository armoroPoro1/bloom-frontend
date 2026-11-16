import {contentSeed} from './contentSeed';
import type {Product,Shop,Order,User,State} from './types';
export const categories=[{id:'all',name:'สินค้าทั้งหมด',icon:'grid'},{id:'supplements',name:'วิตามิน & อาหารเสริม',icon:'pill'},{id:'skincare',name:'สกินแคร์ & ความงาม',icon:'sparkles'},{id:'fitness',name:'อุปกรณ์ออกกำลังกาย',icon:'dumbbell'},{id:'food',name:'อาหารเพื่อสุขภาพ',icon:'salad'},{id:'lifestyle',name:'ไลฟ์สไตล์สุขภาพ',icon:'heart'}];
export const products:Product[]=[
 {id:'p1',name:'Bloom Vitamin C Complex',en:'วิตามินซี • 30 แคปซูล',category:'supplements',price:390,original:490,image:0,rating:4.9,reviews:128,stock:24,shopId:'s1',badge:'BEST SELLER',description:'ผลิตภัณฑ์วิตามินซีในบรรจุภัณฑ์พกพาสะดวก สำหรับรายละเอียดส่วนประกอบและวิธีใช้ โปรดอ่านฉลากผลิตภัณฑ์ สินค้าและราคาในหน้านี้เป็นข้อมูลตัวอย่างสำหรับทดลองระบบ',active:true},
 {id:'p2',name:'Rose Hydrating Serum',en:'เซรั่มบำรุงผิว • 30 มล.',category:'skincare',price:690,original:890,image:1,rating:4.8,reviews:96,stock:18,shopId:'s2',badge:'-22%',description:'เซรั่มเนื้อบางเบาสำหรับรูทีนการดูแลผิวประจำวัน บรรจุในขวดดรอปเปอร์สีโรส ควรทดสอบการใช้บนผิวบริเวณเล็กก่อน สินค้าและราคาเป็นข้อมูลตัวอย่าง',active:true},
 {id:'p3',name:'Everyday Yoga Mat',en:'เสื่อโยคะสีลาเวนเดอร์ • 6 มม.',category:'fitness',price:890,original:1090,image:2,rating:4.9,reviews:74,stock:16,shopId:'s3',badge:'NEW',description:'เสื่อออกกำลังกายพร้อมบล็อกสำหรับจัดมุมออกกำลังกายที่บ้าน ขนาดตัวอย่าง 183 × 61 ซม. เช็ดทำความสะอาดและผึ่งให้แห้งหลังใช้งาน',active:true},
 {id:'p4',name:'Plant Protein — Vanilla',en:'โปรตีนจากพืช • 500 กรัม',category:'supplements',price:1190,original:1390,image:3,rating:4.8,reviews:203,stock:12,shopId:'s1',description:'โปรตีนจากพืชกลิ่นวานิลลา อ่านข้อมูลโภชนาการและสารก่อภูมิแพ้บนฉลากก่อนบริโภค ภาพและรายละเอียดเป็นข้อมูลจำลองของเว็บไซต์ต้นแบบ',active:true},
 {id:'p5',name:'Rainbow Nourish Bowl',en:'ธัญพืชและผักหลากสี • 1 ชุด',category:'food',price:189,original:219,image:4,rating:4.7,reviews:62,stock:20,shopId:'s4',badge:'FRESH PICK',description:'ตัวอย่างชุดอาหารพร้อมรับประทาน ประกอบด้วยธัญพืช ผัก และโปรตีนจากพืช รายการวัตถุดิบและสารก่อภูมิแพ้ต้องตรวจจากผู้ขายก่อนสั่งจริง',active:true},
 {id:'p6',name:'Bloom Daily Bottle',en:'กระบอกน้ำสีโรส • 750 มล.',category:'lifestyle',price:490,original:590,image:5,rating:4.9,reviews:88,stock:28,shopId:'s1',description:'กระบอกน้ำสำหรับพกไปทำงานหรือออกกำลังกาย สีชมพูโรส ความจุตัวอย่าง 750 มล. ล้างด้วยมือและผึ่งให้แห้ง',active:true},
 {id:'p7',name:'Daily Glow Essentials',en:'ชุดดูแลผิวประจำวัน • 2 ชิ้น',category:'skincare',price:990,original:1290,image:1,rating:4.8,reviews:43,stock:9,shopId:'s2',badge:'SET',description:'ชุดตัวอย่างสำหรับการดูแลผิวประจำวัน พร้อมบรรจุภัณฑ์โทนโรส ศึกษาฉลากและส่วนประกอบก่อนใช้',active:true},
 {id:'p8',name:'Morning Greens Bowl',en:'มื้อเช้าสไตล์คลีน • 1 ชุด',category:'food',price:159,original:189,image:4,rating:4.6,reviews:35,stock:15,shopId:'s4',description:'ชุดอาหารเช้าตัวอย่างพร้อมผักและธัญพืช ข้อมูลเมนูใช้สำหรับแสดงฟังก์ชันร้านค้า',active:true},
 {id:'p9',name:'Soft Flow Starter Set',en:'ชุดเสื่อโยคะและบล็อก • 1 ชุด',category:'fitness',price:1290,original:1590,image:2,rating:4.9,reviews:51,stock:8,shopId:'s3',description:'ชุดอุปกรณ์สำหรับจัดพื้นที่เคลื่อนไหวที่บ้าน ภาพสินค้าเป็นภาพประกอบตัวอย่าง',active:true},
 {id:'p10',name:'Bloom Vitamin Daily Set',en:'วิตามินแบบแพ็กคู่ • 2 กระปุก',category:'supplements',price:690,original:980,image:0,rating:4.8,reviews:47,stock:10,shopId:'s1',badge:'VALUE SET',description:'สินค้าตัวอย่างสำหรับแสดงโปรโมชันแบบชุด โปรดอ่านฉลากก่อนใช้ผลิตภัณฑ์จริง',active:true},
 {id:'p11',name:'Plant Protein — Original',en:'โปรตีนจากพืช • 500 กรัม',category:'supplements',price:1090,original:1290,image:3,rating:4.7,reviews:82,stock:14,shopId:'s1',description:'ผลิตภัณฑ์ตัวอย่างในหมวดอาหารเสริม โปรดตรวจข้อมูลส่วนประกอบและสารก่อภูมิแพ้จากฉลากจริง',active:true},
 {id:'p12',name:'Everyday Hydration Bottle',en:'กระบอกน้ำพกพา • 500 มล.',category:'lifestyle',price:390,original:490,image:5,rating:4.8,reviews:59,stock:19,shopId:'s1',description:'กระบอกน้ำขนาดกะทัดรัดสำหรับใช้ประจำวัน ภาพสินค้าและราคาเป็นข้อมูลตัวอย่าง',active:true}
];
export const shops:Shop[]=[
 {id:'s1',name:'Bloom Official',owner:'Prim',email:'seller@bloom.demo',description:'สิ่งดี ๆ สำหรับการดูแลตัวเองในทุกวัน',status:'approved',date:'2026-10-01'},
 {id:'s2',name:'Rose & Ritual',owner:'Rose',email:'rose@bloom.demo',description:'Everyday skin rituals',status:'approved',date:'2026-10-04'},
 {id:'s3',name:'Move Studio',owner:'Move',email:'move@bloom.demo',description:'เคลื่อนไหวในจังหวะของคุณ',status:'approved',date:'2026-10-05'},
 {id:'s4',name:'The Good Bowl',owner:'Good',email:'bowl@bloom.demo',description:'มื้ออร่อยที่ดูแลคุณ',status:'approved',date:'2026-10-12'},
 {id:'s5',name:'Luna Wellness',owner:'Luna',email:'luna@bloom.demo',description:'ร้านของใช้และอุปกรณ์เพื่อสุขภาพ',status:'pending',date:'2026-11-13'}
];
export const users:User[]=[
 {id:'u1',name:'Prim',email:'prim@bloom.demo',phone:'0812345678',address:'99 ถนนสุขใจ ตำบลสุเทพ อำเภอเมือง เชียงใหม่ 50200',role:'user'},
 {id:'u2',name:'Bloom Seller',email:'seller@bloom.demo',phone:'0823456789',address:'88 ถนนสวนดอก เชียงใหม่ 50200',role:'seller',shopId:'s1'},
 {id:'u3',name:'Bloom Admin',email:'admin@bloom.demo',phone:'',address:'',role:'admin'}
];
const oi=(id:string,q:number)=>{const p=products.find(p=>p.id===id)!;return {productId:id,name:p.name,price:p.price,quantity:q,image:p.image}};
export const orders:Order[]=[
 {id:'BL-261114-1042',date:'2026-11-14T03:00:00.000Z',buyerId:'u1',buyer:'Prim',shopId:'s1',items:[oi('p1',1),oi('p6',1)],subtotal:880,shipping:40,discount:0,total:920,status:'shipped',address:users[0].address,tracking:'DEMO123456TH',carrier:'ไปรษณีย์ไทย',payment:'demo'},
 {id:'BL-261112-1038',date:'2026-11-12T06:00:00.000Z',buyerId:'u1',buyer:'Prim',shopId:'s2',items:[oi('p2',1)],subtotal:690,shipping:40,discount:0,total:730,status:'delivered',address:users[0].address,payment:'demo',tracking:'DEMO987654TH',carrier:'Flash Express'},
 {id:'BL-261113-1040',date:'2026-11-13T10:00:00.000Z',buyerId:'sample2',buyer:'นลิน',shopId:'s1',items:[oi('p4',2)],subtotal:2380,shipping:0,discount:0,total:2380,status:'paid',address:'ที่อยู่ตัวอย่าง กรุงเทพฯ',payment:'demo'},
 {id:'BL-261114-1043',date:'2026-11-14T04:00:00.000Z',buyerId:'sample3',buyer:'พิมพ์ชนก',shopId:'s1',items:[oi('p1',2)],subtotal:780,shipping:40,discount:0,total:820,status:'pending',address:'ที่อยู่ตัวอย่าง เชียงใหม่',payment:'transfer'},
 {id:'BL-261110-1031',date:'2026-11-10T08:00:00.000Z',buyerId:'sample4',buyer:'อริสา',shopId:'s3',items:[oi('p3',1)],subtotal:890,shipping:40,discount:0,total:930,status:'delivered',address:'ที่อยู่ตัวอย่าง นนทบุรี',payment:'demo'}
];
export const seed:State={schemaVersion:2,products,shops,orders,users,categories:categories.filter(c=>c.id!=='all').map(c=>({...c,active:true})),cart:[],wishlist:[],carts:{},wishlists:{u1:['p2','p3']},addresses:[],content:contentSeed,stockMovements:[],auditLog:[],notifications:[],visits:[],currentUserId:null,demoRole:'guest',reviews:[{id:'r1',productId:'p2',userId:'sample6',name:'มินตรา',rating:5,text:'แพ็กสินค้าดีมาก สีแพ็กเกจน่ารัก จัดส่งเรียบร้อยค่ะ',date:'2026-11-10'}],promotions:[{id:'promo1',code:'BLOOM10',title:'ดูแลตัวเองครั้งแรก ลด 10%',percent:10,active:true}],siteTitle:'Bloom',siteNotice:'A LITTLE SELF-CARE, EVERY DAY'};
export const money=(n:number)=>'฿'+n.toLocaleString('th-TH',{maximumFractionDigits:2});
export const statusLabels:Record<string,string>={pending:'รอตรวจชำระเงิน',paid:'ชำระเงินแล้ว',preparing:'กำลังเตรียมสินค้า',shipped:'จัดส่งแล้ว',delivered:'สำเร็จ',cancelled:'ยกเลิกแล้ว',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',suspended:'พักการขาย'};
