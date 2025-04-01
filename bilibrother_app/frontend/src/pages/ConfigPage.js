import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Space, Divider, Tooltip } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { getConfig, updateConfig } from '../services/api';
// Assuming getViewSightConfig and updateViewSightConfig still exist,
// even if they handle more fields on the backend than shown in the UI.
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
  // This state might hold more data than the form shows after loading, which is okay.
  const [viewSightConfig, setViewSightConfig] = useState({});

  // --- Bilibili Cookie Helpers (Unchanged) ---
  const extractCookieValues = (cookieStr) => {
    const result = { SESSDATA: '', bili_jct: '' };
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

  const createCookieString = (data) => {
    let cookieStr = '';
    if (data.SESSDATA) cookieStr += `SESSDATA=${data.SESSDATA};`;
    if (data.bili_jct) cookieStr += `bili_jct=${data.bili_jct};`;
    return cookieStr;
  };

  // --- Load Config Functions ---
  const loadConfig = async () => {
    setLoading(true);
    try {
      const configList = await getConfig();
      const cookieConfig = configList.find(item => item.key === 'bilibili_cookie');
      if (cookieConfig) {
        const extractedValues = extractCookieValues(cookieConfig.value);
        setCookieData(extractedValues);
        form.setFieldsValue(extractedValues);
      } else {
         // Handle case where cookie config doesn't exist yet
         form.resetFields();
         setCookieData({ SESSDATA: '', bili_jct: '' });
      }
    } catch (error) {
      message.error('获取B站配置失败');
      console.error("Error loading Bilibili config:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadViewSightConfig = async () => {
    setVsLoading(true);
    try {
      const configData = await getViewSightConfig(); // Fetches all VS config from backend
      setViewSightConfig(configData || {}); // Store the full data

      // Prepare form values only for the fields present in the UI
      const formValues = {
        viewsight_server_url: configData?.viewsight_server_url?.value || '',
        viewsight_image_url: configData?.viewsight_image_url?.value || '',
        viewsight_image_token: configData?.viewsight_image_token?.value || '',
        viewsight_image_model: configData?.viewsight_image_model?.value || '',
      };

      vsForm.setFieldsValue(formValues);

      // Also load from localStorage as a fallback or initial state if needed
      const storedVsConfig = localStorage.getItem('viewSightConfig');
      if (storedVsConfig && !configData) { // Only use localStorage if backend fetch failed initially
         try {
            const parsedConfig = JSON.parse(storedVsConfig);
            // Make sure to only set fields that exist in the form
             const localStorageFormValues = {
                viewsight_server_url: parsedConfig.viewsight_server_url || '',
                viewsight_image_url: parsedConfig.viewsight_image_url || '',
                viewsight_image_token: parsedConfig.viewsight_image_token || '',
                viewsight_image_model: parsedConfig.viewsight_image_model || '',
             };
            vsForm.setFieldsValue(localStorageFormValues);
         } catch (e) {
            console.error("Failed to parse ViewSight config from localStorage", e);
         }
      }


    } catch (error) {
      message.error('获取ViewSight配置失败');
      console.error("Error loading ViewSight config:", error);
       // Attempt to load from local storage as fallback
       const storedVsConfig = localStorage.getItem('viewSightConfig');
        if (storedVsConfig) {
           try {
              const parsedConfig = JSON.parse(storedVsConfig);
              const localStorageFormValues = {
                 viewsight_server_url: parsedConfig.viewsight_server_url || '',
                 viewsight_image_url: parsedConfig.viewsight_image_url || '',
                 viewsight_image_token: parsedConfig.viewsight_image_token || '',
                 viewsight_image_model: parsedConfig.viewsight_image_model || '',
              };
              vsForm.setFieldsValue(localStorageFormValues);
              message.info('从本地缓存加载了ViewSight配置');
           } catch (e) {
              console.error("Failed to parse ViewSight config from localStorage", e);
              vsForm.resetFields(); // Clear form if localStorage is corrupt
           }
        } else {
            vsForm.resetFields(); // Clear form if both backend and localStorage fail
        }
    } finally {
      setVsLoading(false);
    }
  };

  // --- Initial Load ---
  useEffect(() => {
    loadConfig();
    loadViewSightConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep dependencies empty to run only once on mount

  // --- Save Config Functions ---
  const handleSave = async (values) => {
    setSaving(true);
    try {
      const cookieStr = createCookieString(values);
      await updateConfig('bilibili_cookie', cookieStr);
      localStorage.setItem('bilibili_cookie_data', JSON.stringify(values)); // Keep this as per original code
      message.success('B站配置保存成功');
      setCookieData(values); // Update local state
    } catch (error) {
      console.error('保存B站配置失败:', error);
      message.error(`保存B站配置失败: ${error.message || '请检查网络或联系管理员'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveViewSight = async (values) => {
    setVsSaving(true);
    try {
      // 1. Save to localStorage first
      localStorage.setItem('viewSightConfig', JSON.stringify(values));
      console.log("Saved ViewSight config to localStorage:", values);

      // 2. Update ViewSight configuration via API
      // The backend might receive more fields than necessary,
      // but it should only process the ones it knows about.
      // Or, ideally, the backend API endpoint is designed to accept partial updates.
      await updateViewSightConfig(values); // Send only the form values

      message.success('ViewSight配置保存成功');

      // 3. Refresh state from backend to ensure consistency (optional but good practice)
      // await loadViewSightConfig(); // Reloads the state and form from backend data

    } catch (error) {
      console.error('保存ViewSight配置失败:', error);
      message.error(`保存ViewSight配置失败: ${error.message || '请检查网络或联系管理员'}`);
    } finally {
      setVsSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <Title level={2}>配置设置</Title>

      {/* B站 API 配置 Card (Unchanged Structure) */}
      <Card title="B站API配置" style={{ marginBottom: '20px' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          // initialValues are set via setFieldsValue in loadConfig
        >
          <Paragraph>
            在这里配置访问B站API所需的Cookie信息。请从浏览器开发者工具(F12) - 应用(Application) - Cookies - bilibili.com 中找到 <Text code>SESSDATA</Text> 和 <Text code>bili_jct</Text> 的值并填入下方。
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
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              保存B站配置
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadConfig} loading={loading}>
              重新加载
            </Button>
          </Space>
        </Form>
      </Card>

      {/* ViewSight 配置 Card (Modified) */}
      <Card title="ViewSight预测服务配置" style={{ marginBottom: '20px' }}>
        <Form
          form={vsForm}
          layout="vertical"
          onFinish={handleSaveViewSight}
          // initialValues are set via setFieldsValue in loadViewSightConfig
        >
          <Paragraph>
            配置ViewSight视频播放量预测服务。只需要提供后端地址即可进行基础预测。图像分析相关配置为可选，用于更精准的封面分析。
          </Paragraph>
          <Divider />

          {/* --- Required Field --- */}
          <Form.Item
            name="viewsight_server_url"
            label="ViewSight后端地址"
            rules={[{ required: true, message: '请输入ViewSight后端地址' }]}
            tooltip="ViewSight预测服务的主API地址，例如：http://127.0.0.1:4432"
          >
            <Input placeholder="如: http://localhost:4432" />
          </Form.Item>

          {/* --- Optional Fields --- */}
          <Form.Item
            name="viewsight_image_url"
            label={<Tooltip title="可选：用于分析视频封面的图像分析API地址 (例如 LLaVA API)">图像分析URL</Tooltip>}
            // rules removed - no longer required
          >
            <Input placeholder="可选，如:https://api.siliconflow.cn/v1/chat/completions" />
          </Form.Item>

          <Form.Item
            name="viewsight_image_token"
            label={<Tooltip title="可选：图像分析API可能需要的认证令牌 (Bearer Token)">图像分析TOKEN</Tooltip>}
            // rules removed - no longer required
          >
            <Input.Password placeholder="可选，如:sk-fxxknvidiaaabbccddeeeee" />
          </Form.Item>

          <Form.Item
            name="viewsight_image_model"
            label={<Tooltip title="可选：用于图像分析的模型名称 (例如 LLaVA 模型)">图像分析MODEL</Tooltip>}
            // rules removed - no longer required
          >
            <Input placeholder="可选，推荐:Qwen/Qwen2.5-VL-32B-Instruct" />
          </Form.Item>

          {/* --- Removed Fields ---
            viewsight_backend_url
            viewsight_token
            viewsight_model
           --- */}

          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={vsSaving}>
              保存ViewSight配置
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadViewSightConfig} loading={vsLoading}>
              重新加载
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

export default ConfigPage;