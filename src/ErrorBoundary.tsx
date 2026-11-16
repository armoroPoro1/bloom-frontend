import {Component, type ErrorInfo, type ReactNode} from 'react';

export default class ErrorBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Bloom view could not render', error, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="app-recovery" role="alert"><span className="eyebrow">BLOOM</span><h1>แสดงหน้านี้ไม่สำเร็จ</h1><p>ลองโหลดหน้าแรกอีกครั้ง ข้อมูลที่บันทึกไว้ในเครื่องจะยังอยู่</p><button className="btn btn-primary" onClick={()=>{location.hash='home';location.reload()}}>กลับหน้าแรกและลองใหม่</button></main>;
  }
}
