import * as echarts from 'echarts/core';
import {LineChart} from 'echarts/charts';
import {AriaComponent,DataZoomComponent,GridComponent,LegendComponent,TooltipComponent} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';

echarts.use([LineChart,AriaComponent,DataZoomComponent,GridComponent,LegendComponent,TooltipComponent,CanvasRenderer]);

export {echarts};
