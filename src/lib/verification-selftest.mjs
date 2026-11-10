/** A local, deterministic negative test. Never writes to published or original NASA data. */
import {compareAnnualSeries} from './verification.mjs';
export function runVerificationSelfTest(){
 const original=[{year:2022,value:28.6},{year:2023,value:29.2},{year:2024,value:28.9}];
 const changed=original.map(r=>r.year===2023?{...r,value:r.value+1}:r);
 const mismatch=compareAnnualSeries(changed,original,2022,2024);
 const incomplete=compareAnnualSeries(original.filter(r=>r.year!==2024),original,2022,2024);
 const baseline=compareAnnualSeries(original,original,2022,2024);
 return {passed:baseline.passed&&!mismatch.passed&&mismatch.summary.different===1&&mismatch.rows.find(r=>r.year===2023)?.status==='different'&&!incomplete.passed&&incomplete.summary.missingSite===1,baseline,mismatch,incomplete,testOnly:true,publicClimateDataChanged:false};
}
