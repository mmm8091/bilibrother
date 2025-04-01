import React, { useState } from 'react';
import {
  Card, Button, Form, Input, Spin, Result, Row, Col, Typography, Space, Divider, Statistic, message, Alert
} from 'antd';
import {
  PlayCircleOutlined, TrophyOutlined, ThunderboltOutlined, HeartOutlined, FireOutlined
} from '@ant-design/icons';
import { predictVideoViews } from '../services/viewsightApi';

const { Title, Text, Paragraph } = Typography;

const PredictionPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  // 格式化数字，添加千位分隔符
  const formatNumber = (num) => {
    if (!num && num !== 0) return '-';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 获取趋势评分的颜色
  const getTrendingColor = (score) => {
    if (!score) return '#999999';
    const numScore = parseFloat(score);
    if (numScore >= 0.8) return '#52c41a';
    if (numScore >= 0.6) return '#1890ff';
    if (numScore >= 0.4) return '#faad14'; 
    return '#ff4d4f';
  };

  // 获取评分等级
  const getScoreLevel = (score) => {
    if (!score) return '未知';
    const numScore = parseFloat(score);
    if (numScore >= 0.8) return '优秀';
    if (numScore >= 0.6) return '良好';
    if (numScore >= 0.4) return '一般';
    return '较低';
  };

  // 进行视频播放量预测
  const handleSubmit = async (values) => {
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      // 清理 BV号，提取 BV 号码
      let bvid = values.bvid.trim();
      if (bvid.includes('/')) {
        const match = bvid.match(/BV\w+/);
        if (match) {
          bvid = match[0];
        }
      }

      // 调用预测接口
      const result = await predictVideoViews(bvid);
      setPrediction(result);
      message.success('播放量预测成功');
    } catch (error) {
      const errorMsg = error.response?.data?.error || '预测失败，请检查配置和网络';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Title level={2}>B站视频播放量预测</Title>
      <Paragraph>
        使用 ViewSight 模型对B站视频进行播放量预测分析，获取精确的播放量预估和趋势评分。
      </Paragraph>

      <Card title="视频信息" className="card-container">
        <Form
          form={form}
          name="prediction_form"
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="bvid"
            label="B站视频链接或BV号"
            rules={[{ required: true, message: '请输入B站视频链接或BV号' }]}
            extra="例如: https://www.bilibili.com/video/BV1xx411c79H 或直接输入 BV1xx411c79H"
          >
            <Input placeholder="输入B站视频链接或BV号" allowClear />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<ThunderboltOutlined />}
            >
              开始预测
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {loading && (
        <Card className="card-container">
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <Spin size="large" tip="正在分析视频数据..." />
            <p style={{ marginTop: '20px' }}>正在处理中，这可能需要几分钟时间...</p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="card-container">
          <Alert
            message="预测失败"
            description={error}
            type="error"
            showIcon
          />
        </Card>
      )}

      {prediction && (
        <Card title="预测七日播放量" className="card-container">
  <Row gutter={[24, 24]}>
    <Col xs={24} sm={24} md={8}>
      <Card>
        <Statistic
          title="七日播放量加权分数SCORE"
          value={prediction.predicted_play_count}
          precision={2} // 限制小数点后最多两位
          formatter={(value) => {
            // 使用Intl.NumberFormat来格式化数字
            const formatter = new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2, // 设置最多保留两位小数
            });
            return formatter.format(value);
          }}
          prefix={<PlayCircleOutlined />}
          valueStyle={{ color: '#1890ff' }}
        />
        <Divider />
        <Text type="secondary">预测于: {prediction.prediction_time}</Text>
      </Card>
    </Col>

            <Col xs={24} sm={24} md={8}>
              <Card                   title="七日播放量预估(58%正确)"
              >
                <Statistic
                  value={prediction.estimated7DayViews || '未知'}
                  valueStyle={{ color: '#52c41a' }}
                />
                <Text type="secondary">预估范围(88%频率正确): {prediction.range_score || '未提供'}</Text>
              </Card>
            </Col>

            <Col xs={24} sm={24} md={8}>
              <Card title="趋势评分"> 
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Row align="middle">
                    <Col span={12}><Text><FireOutlined /> 时势潜力评分:</Text></Col>
                    <Col span={12}>
                      <Text style={{ color: getTrendingColor(prediction.trending_analysis.trending) }}>
                        {prediction.trending_analysis.trending || '-'} ({getScoreLevel(prediction.trending_analysis.trending)})
                      </Text>
                    </Col>
                  </Row>
                  <Row align="middle">
                    <Col span={12}><Text><HeartOutlined /> 封标情感评分:</Text></Col>
                    <Col span={12}>
                      <Text style={{ color: getTrendingColor(prediction.trending_analysis.emotion) }}>
                        {prediction.trending_analysis.emotion || '-'} ({getScoreLevel(prediction.trending_analysis.emotion)})
                      </Text>
                    </Col>
                  </Row>
                  <Row align="middle">
                    <Col span={12}><Text><PlayCircleOutlined /> 封面视觉评分:</Text></Col>
                    <Col span={12}>
                      <Text style={{ color: getTrendingColor(prediction.trending_analysis.visual) }}>
                        {prediction.trending_analysis.visual || '-'} ({getScoreLevel(prediction.trending_analysis.visual)})
                      </Text>
                    </Col>
                  </Row>
                  <Row align="middle">
                    <Col span={12}><Text><TrophyOutlined /> 封标创意评分:</Text></Col>
                    <Col span={12}>
                      <Text style={{ color: getTrendingColor(prediction.trending_analysis.creativity) }}>
                        {prediction.trending_analysis.creativity || '-'} ({getScoreLevel(prediction.trending_analysis.creativity)})
                      </Text>
                    </Col>
                  </Row>
                </Space>
              </Card>
            </Col>
          </Row>
          
          <div style={{ marginTop: '20px' }}>
            <Alert
              message="预测说明"
              description={
                <div>
                  <p>该预测基于当前视频的封面、标题、UP主信息及分区等特征，结合AI模型进行综合评估。</p>
                  <p>实际播放量受多种因素影响，预测结果仅供参考。</p>
                  <p>原始消息: {prediction.raw_message}</p>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        </Card>
      )}
      
      <Card title="ViewSight配置说明" className="card-container">
        <Alert
          message="使用前须知"
          description={
            <div>
              <p>首次使用前，请在"系统配置"页面中设置ViewSight相关配置项：</p>
              <ul>
                <li>viewsight_server_url: ViewSight预测服务器地址</li>
                <li>viewsight_image_url: 图像分析API地址</li>
                <li>viewsight_image_token: 图像分析API令牌</li>
                <li>viewsight_image_model: 图像分析模型名称</li>
                <li>viewsight_backend_url: 趋势分析服务地址</li>
                <li>viewsight_token: API令牌</li>
                <li>viewsight_model: 分析模型名称</li>
              </ul>
              <p>确保ViewSight服务已启动并可访问，才能正常使用预测功能。</p>
            </div>
          }
          type="warning"
          showIcon
        />
      </Card>
    </div>
  );
};

export default PredictionPage;
