import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Space, Divider } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { getConfig, updateConfig } from '../services/api';
import { getViewSightConfig, updateViewSightConfig } from '../services/viewsightApi';

const { Title, Text, Paragraph } = Typography;

function ConfigPage() {
  const [form] = Form.useForm();
  const [vsForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vsLoading, setVsLoading] = useState(false);
  const [vsSaving, setVsSaving] = useState(false);
  const [cookieData, setCookieData] = useState({
    SESSDATA: '',
    bili_jct: ''
  });
  const [viewSightConfig, setViewSightConfig] = useState({});

  // 从cookie字符串中提取SESSDATA和bili_jct
  const extractCookieValues = (cookieStr) => {
    const result = {
      SESSDATA: '',
      bili_jct: ''
    };
    
    if (!cookieStr) return result;
    
    const cookies = cookieStr.split(';');
    cookies.forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length !== 2) return;
      
      const key = parts[0].trim();
      const value = parts[1].trim();
      
      if (key === 'SESSDATA') result.SESSDATA = value;
      if (key === 'bili_jct') result.bili_jct = value;
    });
    
    return result;
  };

  // 将SESSDATA和bili_jct合并为cookie字符串
  const createCookieString = (data) => {
    let cookieStr = '';
    if (data.SESSDATA) cookieStr += `SESSDATA=${data.SESSDATA};`;
    if (data.bili_jct) cookieStr += `bili_jct=${data.bili_jct};`;
    return cookieStr;
  };

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const configList = await getConfig();
      // 查找bilibili_cookie配置项
      const cookieConfig = configList.find(item => item.key === 'bilibili_cookie');
      
      if (cookieConfig) {
        const extractedValues = extractCookieValues(cookieConfig.value);
        setCookieData(extractedValues);
        form.setFieldsValue(extractedValues);
      }
    } catch (error) {
      message.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载ViewSight配置
  const loadViewSightConfig = async () => {
    setVsLoading(true);
    try {
      const configData = await getViewSightConfig();
      setViewSightConfig(configData);
      
      // 提取值用于表单初始化
      const formValues = {};
      Object.keys(configData).forEach(key => {
        formValues[key] = configData[key].value;
      });
      
      vsForm.setFieldsValue(formValues);
    } catch (error) {
      message.error('获取ViewSight配置失败');
    } finally {
      setVsLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    loadConfig();
    loadViewSightConfig();
  }, []);

  // 保存配置
  const handleSave = async (values) => {
    setSaving(true);
    try {
      // 合并为cookie字符串
      const cookieStr = createCookieString(values);
      
      // 更新配置
      await updateConfig('bilibili_cookie', cookieStr);
      message.success('配置保存成功');
      
      // 更新本地状态
      setCookieData(values);
    } catch (error) {
      message.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 保存ViewSight配置
  const handleSaveViewSight = async (values) => {
    setVsSaving(true);
    try {
      // 更新ViewSight配置
      await updateViewSightConfig(values);
      message.success('ViewSight配置保存成功');
      
      // 更新本地状态
      await loadViewSightConfig();
    } catch (error) {
      message.error('保存ViewSight配置失败');
    } finally {
      setVsSaving(false);
    }
  };

  return (
    <div className="page-container">
      <Title level={2}>配置设置</Title>
      
      <Card title="B站API配置" className="card-container">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={cookieData}
        >
          <Paragraph>
            在这里配置访问B站API所需的Cookie信息，请从浏览器中获取登录B站后的Cookie。
          </Paragraph>
          
          <Divider />
          
          <Form.Item
            name="SESSDATA"
            label="SESSDATA"
            rules={[{ required: true, message: '请输入SESSDATA' }]}
          >
            <Input.TextArea
              placeholder="请输入B站Cookie中的SESSDATA值"
              autoSize={{ minRows: 1, maxRows: 2 }}
            />
          </Form.Item>
          
          <Form.Item
            name="bili_jct"
            label="bili_jct"
            rules={[{ required: true, message: '请输入bili_jct' }]}
          >
            <Input.TextArea
              placeholder="请输入B站Cookie中的bili_jct值"
              autoSize={{ minRows: 1, maxRows: 2 }}
            />
          </Form.Item>
          
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
            >
              保存配置
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadConfig}
              loading={loading}
            >
              重新加载
            </Button>
          </Space>
        </Form>
      </Card>

      <Card title="ViewSight预测服务配置" className="card-container">
        <Form
          form={vsForm}
          layout="vertical"
          onFinish={handleSaveViewSight}
        >
          <Paragraph>
            配置ViewSight视频播放量预测服务所需的API信息，这些配置用于预测视频播放量和热度分析。
          </Paragraph>
          
          <Divider />
          
          <Form.Item
            name="viewsight_server_url"
            label="ViewSight服务器地址"
            rules={[{ required: true, message: '请输入ViewSight服务器地址' }]}
            tooltip="ViewSight预测服务器的完整URL地址，如http://localhost:4432"
          >
            <Input placeholder="如: http://localhost:4432" />
          </Form.Item>
          
          <Form.Item
            name="viewsight_image_url"
            label="图像分析API地址"
            rules={[{ required: true, message: '请输入图像分析API地址' }]}
            tooltip="用于分析视频封面的图像分析API地址"
          >
            <Input placeholder="图像分析API地址" />
          </Form.Item>
          
          <Form.Item
            name="viewsight_image_token"
            label="图像分析API令牌"
            rules={[{ required: true, message: '请输入图像分析API令牌' }]}
            tooltip="图像分析API使用的认证令牌"
          >
            <Input.Password placeholder="图像分析API令牌" />
          </Form.Item>
          
          <Form.Item
            name="viewsight_image_model"
            label="图像分析模型"
            rules={[{ required: true, message: '请输入图像分析模型名称' }]}
            tooltip="用于图像分析的模型名称"
          >
            <Input placeholder="图像分析模型名称" />
          </Form.Item>
          
          <Form.Item
            name="viewsight_backend_url"
            label="趋势分析服务地址"
            rules={[{ required: true, message: '请输入趋势分析服务地址' }]}
            tooltip="用于分析视频趋势的API服务地址"
          >
            <Input placeholder="趋势分析服务地址" />
          </Form.Item>
          
          <Form.Item
            name="viewsight_token"
            label="ViewSight API令牌"
            rules={[{ required: true, message: '请输入ViewSight API令牌' }]}
            tooltip="ViewSight API使用的认证令牌"
          >
            <Input.Password placeholder="ViewSight API令牌" />
          </Form.Item>
          
          <Form.Item
            name="viewsight_model"
            label="ViewSight分析模型"
            rules={[{ required: true, message: '请输入ViewSight分析模型名称' }]}
            tooltip="用于视频分析的模型名称"
          >
            <Input placeholder="ViewSight分析模型名称" />
          </Form.Item>
          
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={vsSaving}
            >
              保存ViewSight配置
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadViewSightConfig}
              loading={vsLoading}
            >
              重新加载
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

export default ConfigPage;
