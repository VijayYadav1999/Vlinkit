import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';

@Injectable()
export class KafkaConsumerService implements OnModuleInit {
  private kafka: Kafka;
  private consumer: Consumer;
  private handlers: Map<string, (message: any) => Promise<void>> = new Map();

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
    this.consumer = this.kafka.consumer({
      groupId: configService.get('KAFKA_GROUP_ID', 'order-service-group'),
    });
  }

  registerHandler(topic: string, handler: (message: any) => Promise<void>) {
    this.handlers.set(topic, handler);
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();

      // Subscribe to topics relevant to order service
      const topics = ['order.assigned', 'order.status'];
      for (const topic of topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }

      await this.consumer.run({
        eachMessage: async ({ topic, message }: EachMessagePayload) => {
          const value = JSON.parse(message.value.toString());
          console.log(`📥 Kafka message received on ${topic}:`, value);

          const handler = this.handlers.get(topic);
          if (handler) {
            await handler(value);
          }
        },
      });

      console.log('✅ Kafka consumer connected and listening');
    } catch (error) {
      console.error('❌ Kafka consumer connection failed:', error.message);
    }
  }
}
