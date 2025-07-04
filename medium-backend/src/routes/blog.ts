import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'
import { Variables } from "hono/types";
import { createBlogInput, updateBlogInput} from "@sahildale/medium-common";
export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string
    },
    Variables:{
        userId:string,
        id:string
    }
}>();

blogRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  try {
    const user = await verify(token, c.env.JWT_SECRET)  

    c.set("userId", user.id); 
    return await next();
  } catch (err) {

    return c.json({
      message: "You are not logged in",
    });
  }
});
blogRouter.post('/', async (c) => {
     const body = await c.req.json();
     const authorId=c.get("userId")
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

	const { success } = createBlogInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}

  const blog =await prisma.blog.create({
    data:{
        title:body.title,
        content:body.content,
        authorId:Number(authorId)
    }
  })
  return c.json({
    id:blog.id
  })
})

blogRouter.put('/', async (c) => {
   const body = await c.req.json();
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const { success } = updateBlogInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}

  const blog =await prisma.blog.update({
    where:{
        id:body.id
    },
    data:{
        title:body.title,
        content:body.content,
    }
  })
  return c.json({
    id:blog.id
  })
})
//todo :add pagination
blogRouter.get('/bulk', async(c) => {
     const body = await c.req.json();
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const blog=prisma.blog.findMany();



  return c.json(
    blog
  )
})

blogRouter.get('/:id', async (c) => {
   const id=c.req.param("id");
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());


try{
      const blog =await prisma.blog.findFirst({
    where:{
        id:Number(id)
    }
  })
  return c.json({
    blog
  });
}catch(e){
    c.status(411);
    return c.json({
        message:"error while fetching blogs"
    })
}
})

