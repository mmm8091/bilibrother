import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import {
  BarChartOutlined,
  SettingOutlined,
  VideoCameraOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import './App.css';

// 导入页面组件
import VideoPage from './pages/VideoPage';
import ConfigPage from './pages/ConfigPage';
import PredictionPage from './pages/PredictionPage';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
          theme="dark"
        >
          <div className="logo">
            <Typography.Text strong style={{ color: 'white', fontSize: collapsed ? 14 : 18, padding: '0 16px', lineHeight: '64px' }}>
              {collapsed ? 'BB' : 'BiliBrother'}
            </Typography.Text>
          </div>
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
            <Menu.Item key="1" icon={<VideoCameraOutlined />}>
              <Link to="/">视频监控</Link>
            </Menu.Item>
            <Menu.Item key="3" icon={<LineChartOutlined />}>
              <Link to="/prediction">播放量预测</Link>
            </Menu.Item>
            <Menu.Item key="2" icon={<SettingOutlined />}>
              <Link to="/settings">配置设置</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout className="site-layout">
          <Header className="site-layout-background" style={{ padding: 0 }}>
            <Title level={4} style={{ color: 'white', margin: '16px 24px' }}>
              BiliBrother - B站视频数据监控工具
            </Title>
          </Header>
          <Content style={{ margin: '0 16px' }}>
            <div className="site-layout-background content-container">
              <Routes>
                <Route path="/" element={<VideoPage />} />
                <Route path="/settings" element={<ConfigPage />} />
                <Route path="/prediction" element={<PredictionPage />} />
              </Routes>
            </div>
          </Content>
          <Layout.Footer style={{ textAlign: 'center' }}>
            BiliBrother &copy;{new Date().getFullYear()} Created with &hearts;
          </Layout.Footer>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;
