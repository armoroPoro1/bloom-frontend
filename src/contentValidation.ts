import type {ContentData} from './contentTypes';

const nonempty = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const within = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

export function contentError(content: ContentData, previous: ContentData): string | null {
  for (const list of [content.articles, content.foods, content.mealTemplates, content.exerciseTemplates]) {
    if (!Array.isArray(list) || list.some(item => !item || !nonempty(item.id)) || new Set(list.map(item => item.id)).size !== list.length)
      return 'รายการเนื้อหาไม่ถูกต้องหรือมีรหัสซ้ำกัน กรุณาลองใหม่';
  }
  if (content.articles.some(a => !nonempty(a.title) || !Array.isArray(a.paras) || a.paras.some(p => typeof p !== 'string') || (a.published && !a.paras.some(nonempty))))
    return 'กรุณาใส่ชื่อและเนื้อหาบทความก่อนเผยแพร่';
  if (content.foods.some(f => !nonempty(f.name) || !nonempty(f.detail) || !within(f.kcal, 0, 10000)))
    return 'กรุณาตรวจสอบชื่ออาหาร หน่วยบริโภค และแคลอรี 0–10,000 kcal';
  for (const template of content.mealTemplates) {
    if (!nonempty(template.name) || !Array.isArray(template.entries) || (template.active && !template.entries.length))
      return 'ชุดมื้ออาหารที่เปิดใช้งานต้องมีชื่อและอาหารอย่างน้อย 1 รายการ';
    if (template.entries.some(entry => !content.foods.some(f => f.id === entry.foodId) || !nonempty(entry.meal) || !within(entry.portions, .5, 10)))
      return 'ตรวจสอบเมนูและจำนวนหน่วยบริโภค 0.5–10 หน่วย';
    const prior = previous.mealTemplates.find(t => t.id === template.id);
    const changed = !prior?.active || JSON.stringify(prior.entries) !== JSON.stringify(template.entries);
    if (template.active && changed && template.entries.some(entry => !content.foods.find(f => f.id === entry.foodId)?.active))
      return 'เปิดใช้หรือแก้ไขชุดมื้ออาหารได้เมื่อทุกเมนูในชุดเปิดใช้งานอยู่';
  }
  for (const template of content.exerciseTemplates) {
    if (!nonempty(template.name) || !Array.isArray(template.days) || template.days.length !== 7 || template.days.some(day => !Array.isArray(day)))
      return 'ตารางกิจกรรมต้องมีชื่อและครบทั้ง 7 วัน';
    const activities = template.days.flat();
    if ((template.active && !activities.length) || activities.some(a => !a || !nonempty(a.id) || !nonempty(a.name) || !within(a.minutes, 0, 600) || !Number.isInteger(a.minutes)))
      return 'ตารางที่เปิดใช้งานต้องมีกิจกรรม และระยะเวลาเป็นจำนวนเต็ม 0–600 นาที';
    if (new Set(activities.map(a => a.id)).size !== activities.length)
      return 'รหัสกิจกรรมในตารางซ้ำกัน กรุณาสร้างรายการใหม่';
  }
  return null;
}
