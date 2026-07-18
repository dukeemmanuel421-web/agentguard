import { DynamoDBAdapter } from '@next-auth/dynamodb-adapter'
import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { authDynamo,tables } from '@/lib/aws'

export const authOptions:NextAuthOptions={
 secret:process.env.AUTH_SECRET,
 adapter:tables.auth?DynamoDBAdapter(authDynamo,{tableName:tables.auth,partitionKey:'pk',sortKey:'sk',indexName:'byId'}):undefined,
 session:{strategy:'database',maxAge:60*60*24*30},
 providers:[EmailProvider({
  server:{host:process.env.EMAIL_SERVER_HOST||'smtp.gmail.com',port:Number(process.env.EMAIL_SERVER_PORT||465),secure:true,auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_APP_PASSWORD}},
  from:process.env.EMAIL_FROM,
 })],
 pages:{signIn:'/login'},
 callbacks:{session({session,user}){if(session.user)session.user.id=user.id;return session}},
}

export const getSession=()=>getServerSession(authOptions)
