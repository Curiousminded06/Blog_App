import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'
import { signinInput, signupInput } from "@sahildale/medium-common";
export const userRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string
    }
}>();



userRouter.post('/signup', async (c) => {
  const body = await c.req.json();
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const { success } = signupInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username: body.username }
    });
    if (existingUser) {
      c.status(409);
      return c.json({ error: "Username already exists" });
    }
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
        name: body.name,
      }
    });

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.text(jwt, 200, {
      message: "User created successfully",
    });

  } catch (e) {
    console.log(e);
    c.status(500);
    return c.text("Internal server error");
  }
})

userRouter.post('/signin', async (c) => {
 
const body = await c.req.json();
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const { success } = signinInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}
  try{
    const user = await prisma.user.findFirst({
      where: {
        username: body.username,
        password: body.password,
      }
    });
    if (!user) {
      c.status(403);
      return c.text("Invalid username or password");
    }

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.text(jwt, 200, {
      message: "User signed in successfully",
    });

  } catch(e) {
    console.log(e);
    c.status(500);
    return c.text("Internal server error");
  }
});
