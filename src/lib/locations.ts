export type Point={id:string;ar:string;en:string;governorate:string;lat:number;lon:number;sample?:string;sampleNote?:string};
// Reference coordinates are city/area points, NOT administrative centroids or verified wilayat boundaries.
export const POINTS:Point[]=[
 {id:'muscat-east',ar:'مسقط — عينة NASA (شرق)',en:'Muscat — NASA sample East',governorate:'Muscat',lat:23.5946,lon:58.7351,sample:'/data/muscat-east.json',sampleNote:'NASA monthly CSV originally supplied by the user'},
 {id:'muscat-west',ar:'مسقط — عينة NASA (غرب)',en:'Muscat — NASA sample West',governorate:'Muscat',lat:23.6137,lon:58.5940,sample:'/data/muscat-west.json',sampleNote:'NASA monthly CSV originally supplied by the user'},
 {id:'salalah',ar:'صلالة',en:'Salalah',governorate:'Dhofar',lat:17.0194,lon:54.0897,sample:'/data/salalah-rh.json',sampleNote:'User supplied annual RH2M only; original NASA request not independently verified'},
 {id:'sohar',ar:'صحار',en:'Sohar',governorate:'Al Batinah North',lat:24.3474,lon:56.7094},
 {id:'nizwa',ar:'نزوى',en:'Nizwa',governorate:'Ad Dakhliyah',lat:22.9333,lon:57.5333},
 {id:'sur',ar:'صور',en:'Sur',governorate:'Ash Sharqiyah South',lat:22.5667,lon:59.5294},
 {id:'khasab',ar:'خصب',en:'Khasab',governorate:'Musandam',lat:26.1799,lon:56.2477},
 {id:'buraimi',ar:'البريمي',en:'Al Buraimi',governorate:'Al Buraymi',lat:24.2486,lon:55.7931,sample:'/data/buraimi.json',sampleNote:'NASA POWER API response preserved in the v3.9 evidence archive'},
 {id:'ibri',ar:'عبري',en:'Ibri',governorate:'Ad Dhahirah',lat:23.2257,lon:56.5157},
 {id:'rustaq',ar:'الرستاق',en:'Rustaq',governorate:'Al Batinah South',lat:23.3908,lon:57.4244},
 {id:'ibra',ar:'إبراء',en:'Ibra',governorate:'Ash Sharqiyah North',lat:22.6906,lon:58.5334},
 {id:'duqm',ar:'الدقم',en:'Duqm',governorate:'Al Wusta',lat:19.6601,lon:57.7041}
];
export const METRIC_DETAILS={
 T2M:{ar:'درجة الحرارة',en:'Air temperature',unit:'°C',changeUnit:'°C'},
 RH2M:{ar:'الرطوبة النسبية',en:'Relative humidity',unit:'%',changeUnit:'pp'},
 PRECTOTCORR_SUM:{ar:'الأمطار المجمعة',en:'Precipitation sum',unit:'Unit under review',changeUnit:'unit under review'}
} as const;
export type Metric=keyof typeof METRIC_DETAILS;
export const METRICS=Object.keys(METRIC_DETAILS) as Metric[];
