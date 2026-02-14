import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;

  constructor(private configService: ConfigService) {
    const kafkaConfig: any = {
      clientId: configService.get('KAFKA_CLIENT_ID', 'order-service'),
      brokers: (configService.get('KAFKA_BROKERS', 'localhost:9092')).split(','),
    };

    const saslUsername = configService.get('KAFKA_SASL_USERNAME');
    const saslPassword = configService.get('KAFKA_SASL_PASSWORD');
    if (saslUsername && saslPassword) {
      kafkaConfig.ssl = true;
      kafkaConfig.sasl = {
        mechanism: configService.get('KAFKA_SASL_MECHANISM', 'plain'),
        username: saslUsername,
        password: saslPassword,
      };
    }

    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      console.log('✅ Kafka producer connected');
    } catch (error) {
      console.error('❌ Kafka producer connection failed:', error.message);
    }
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async emit(topic: string, message: any) {
    try {
      console.log(`📨 [KafkaProducer] Sending to topic "${topic}":`, JSON.stringify(message, null, 2));
      const result = await this.producer.send({
        topic,
        messages: [
          {
            key: message.orderId || message.id || Date.now().toString(),
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      });
      console.log(`✅ [KafkaProducer] Successfully emitted to ${topic}:`, result);
    } catch (error) {
      console.error(`❌ [KafkaProducer] Failed to emit to ${topic}:`, error.message, error.stack);
      throw error;
    }
  }
}
