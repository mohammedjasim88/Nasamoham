type AnnualRecord={year:number;value:number|null};
type Invalid={valid:false;reason:string;n?:number;perDecade?:number};
type HAC={valid:true;n:number;start:number;end:number;lag:number;slope:number;perDecade:number;standardError:number;pValue:number;ci95:[number,number];significant:boolean;method:string;limitations:string};
type MK={valid:true;n:number;s:number;variance:number;z:number;pValue:number;significant:boolean;omitted:number;method:string;limitations:string};
export function neweyWestTrend(records:AnnualRecord[],options?:{lag?:number}):HAC|Invalid;
export function mannKendall(records:AnnualRecord[]):MK|Invalid;
export function pairedTrendDifference(a:AnnualRecord[],b:AnnualRecord[]):(HAC&{direction:string;series:AnnualRecord[]})|Invalid;
