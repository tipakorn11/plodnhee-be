import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpAdapter().getInstance())
      .get('/')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'ok',
          service: 'plodnhee-be',
        });
        expect(body.checkedAt).toEqual(expect.any(String));
      });
  });

  it('creates, reduces, and removes a person bill in a group', async () => {
    const server = app.getHttpAdapter().getInstance();
    const session = await request(server)
      .post('/auth/register')
      .send({ email: 'mali@example.com', password: 'safe-password-123' })
      .expect(201);
    const authorization = `Bearer ${session.body.accessToken}`;
    const person = await request(server)
      .post('/people')
      .set('Authorization', authorization)
      .send({ name: 'Mali', profileImageUrl: 'https://images.example.com/mali.jpg' })
      .expect(201);
    const group = await request(server)
      .post('/groups')
      .set('Authorization', authorization)
      .send({ name: 'Friday dinner' })
      .expect(201);
    const bill = await request(server)
      .post(`/groups/${group.body.id}/bills`)
      .set('Authorization', authorization)
      .send({ personId: person.body.id, amount: 200, description: 'Food' })
      .expect(201);

    await request(server)
      .patch(`/bills/${bill.body.id}`)
      .set('Authorization', authorization)
      .send({ amount: 150 })
      .expect(200)
      .expect(({ body }) => expect(body.amount).toBe(150));

    await request(server)
      .get(`/groups/${group.body.id}`)
      .set('Authorization', authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body.totalOwed).toBe(150);
        expect(body.members).toHaveLength(1);
        expect(body.members[0]).toMatchObject({ totalOwed: 150, billCount: 1 });
      });

    await request(server).delete(`/bills/${bill.body.id}`).set('Authorization', authorization).expect(204);
    await request(server)
      .get(`/groups/${group.body.id}`)
      .set('Authorization', authorization)
      .expect(200)
      .expect(({ body }) => expect(body.bills).toHaveLength(0));
  });

  afterEach(async () => {
    await app.close();
  });
});
