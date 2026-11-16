export type Article = {id:string;category:string;title:string;subtitle:string;time:string;image:string;tag:string;paras:string[];published:boolean;updatedAt?:string};
export type Food = {id:string;name:string;detail:string;kcal:number;group:string;active:boolean};
export type MealTemplate = {id:string;name:string;description:string;active:boolean;entries:{foodId:string;meal:string;portions:number}[]};
export type Activity = {id:string;name:string;minutes:number;type:string};
export type ExerciseTemplate = {id:string;name:string;description:string;active:boolean;days:Activity[][]};
export type ContentData = {articles:Article[];foods:Food[];mealTemplates:MealTemplate[];exerciseTemplates:ExerciseTemplate[]};
