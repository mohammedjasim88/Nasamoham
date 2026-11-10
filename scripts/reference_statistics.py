"""Independent SciPy/statsmodels oracle. Run from repository root.
pip install scipy statsmodels; python scripts/reference_statistics.py
The JavaScript tests consume this generated reference fixture.
"""
import json
from pathlib import Path
import numpy as np
import scipy
from scipy import stats
import statsmodels
import statsmodels.api as sm
from statsmodels.stats.sandwich_covariance import cov_hac

cases=[]
for name,values in [
    ('oscillating', [2+.06*i+np.sin(i*.7)*.8 for i in range(26)]),
    ('ties', [3,2,4,4,3,5,5,6,4,7,8,7,8,9,7,9,10,8,11,10]),
    ('downward', [10-.09*i+np.cos(i*.8) for i in range(26)]),
    ('outlier', [2+.04*i+np.sin(i)+(5 if i==20 else 0) for i in range(26)]),
]:
    y=np.asarray(values);x=np.arange(len(y));n=len(y)
    fit=sm.OLS(y,sm.add_constant(x-x.mean())).fit()
    lag=int(np.floor(4*(n/100)**(2/9)))
    se=float(np.sqrt(cov_hac(fit,nlags=lag,use_correction=True)[1,1]))
    slope=float(fit.params[1]);margin=float(stats.t.ppf(.975,n-2)*se)
    cases.append(dict(name=name,records=[dict(year=2000+i,value=float(v)) for i,v in enumerate(y)],
        hac=dict(slope=slope,standardError=se,pValue=float(2*stats.t.sf(abs(slope/se),n-2)),ci95=[slope-margin,slope+margin],lag=lag),
        mkP=float(stats.kendalltau(x,y,method='asymptotic').pvalue),
        sen=float(stats.theilslopes(y,x).slope),olsP=float(fit.pvalues[1])))
out=Path('tests/fixtures/statistical-reference.json');out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(dict(versions=dict(scipy=scipy.__version__,statsmodels=statsmodels.__version__,numpy=np.__version__),cases=cases),indent=2)+'\n')
print('Independent reference written:',out)
