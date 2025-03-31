import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Space, Divider } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { getConfig, updateConfig } from '../services/api';

const { Title, Text, Paragraph } = Typography;

function ConfigPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cookieData, setCookieData] = useState({
    SESSDATA: '',
    bili_jct: ''
  });

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

  // 首次加载
  useEffect(() => {
    loadConfig();
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

  return (
    <div>
      <Title level={2}>配置设置</Title>
      
      <Card>
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
    </div>
  );
}

export default ConfigPage;
