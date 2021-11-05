import { Router } from 'itty-router'
import AWS from 'aws-sdk'



AWS.config.update({
  accessKeyId: '',
  secretAccessKey: ''
})

//API headers
const apiHeaders = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Origin': '*',
  'Content-type': 'application/json;charset=UTF-8'
}


//DOA layer   
const createPost = async (id, post) => {
  return POSTS.put(id, post)
}

const getAllPost = async () => {
  const postKeys = await POSTS.list()
  let allPost = []
  for (let key of postKeys.keys) {
    let post = await POSTS.get(key.name)
    allPost.push(JSON.parse(post))
  }
  return allPost
}

const getPostById = async (id) => {
  return POSTS.get(id)
}

const createComment = async (postId, comment) => {
  const existingComment = await COMMENTS.get(postId)
  if (!existingComment) {
      return await COMMENTS.put(postId, JSON.stringify([{
      id:generateId,
      comment, 
      createdAt: new Date().toUTCString(),
    }]))
  }
  let commentArray = JSON.parse(existingComment)
  commentArray.push({comment:comment, createdAt: new Date().toUTCString(), id:generateId()})
  return COMMENTS.put(postId, JSON.stringify(commentArray))
}

const getPostComments = async (postId) => {
  return await COMMENTS.get(postId)
}


//helpers
const generateId = () => {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  const id = (S4() + "-" + S4() + "-" + S4() + "-" + S4() + Date.now())
  return id;
}

const handleResponse = (response) => {
  return JSON.stringify(response, null, 8)
}

const uploadImage = async (imageName, imageBuffer) => {
  try {
    var s3 = new AWS.S3
    const result = await s3.upload({
      Bucket: 'intern-image-repo',
      Body: imageBuffer,
      Key: imageName + Date.toString()
    }).promise()
    return result.Location
  } catch (e) {
    console.log(e)
    throw new Error(e.message)
  }
}

const ErrorResponse = async ({ statusCode = 500, message = 'Internal server error' } = {}) => {
  return new Response(message, {
    status: statusCode,
    headers: {
      ...apiHeaders
    }
  })
}



//routing&controller layer
const router = Router()

router.get("/", async request => {
  try {
    return new Response(JSON.stringify({
      status:"Alive"
    }, null, 2), {
      status: 200,
      headers: {
        ...apiHeaders
      }
    })
  } catch (e) {
    return ErrorResponse({ message: e.message })
  }
})

router.get("/posts", async request => {
  try {
    const posts = await getAllPost()
    return new Response(JSON.stringify(posts, null, 2), {
      status: 200,
      headers: {
        ...apiHeaders
      }
    })
  } catch (e) {
    return ErrorResponse({ message: e.message })
  }
})


router.post("/posts", async request => {
  try {
    const postData = await request.json()
    if (!postData.title || !postData.username || !postData.content) {
      return ErrorResponse({ statusCode: 400, message: "One or more fields are missing in the input" })
    }
    const post = Object.assign({}, postData, { id: generateId(), createdAt: new Date().toUTCString() })
    await createPost(post.id, JSON.stringify(post))
    return new Response(JSON.stringify(post), {
      status: 201,
      headers: {
        ...apiHeaders
      }
    })
  } catch (e) {
    console.log(e)
    return ErrorResponse({ message: e.message })
  }
})

router.get("/posts/:id/comments", async ({ params }) => {
  try{
    const postId = decodeURIComponent(params.id)
    if (!postId) return ErrorResponse({ statusCode: 400, message: "Id is missing" })
    const comments = await getPostComments(postId)
    if (!comments) return ErrorResponse({ statusCode: 401, message: "No comments for this post" })
    return new Response(comments, {
      status: 200,
      headers: {
        ...apiHeaders
      }
    }
    )
  }catch(e){
    console.log(e)
    return ErrorResponse({message:e.mmsage})
  }
})

router.post("/posts/:id/comments", async (request) => {
 try{
  const id = decodeURIComponent(request.params.id)
  console.log(id)
  if (!id) return ErrorResponse({ statusCode: 400, message: "Id is missing" })
  const commentData = await request.json()
  console.log(commentData)
  if(!commentData.comment){
    return ErrorResponse({statusCode:400, message:"messing field"})
  }
  const comment = await createComment(id, commentData.comment)
  return new Response(comment, {
    status: 200,
    headers: {
      ...apiHeaders
    }
  }
  )
 }catch(e){
   return ErrorResponse({message:e.message})
 }
})

router.post("/posts/:id/upvote", async ({ params }) => {
  const id = decodeURIComponent(params.id)
  if (!id) return ErrorResponse({ statusCode: 400, message: "Id is missing" })
  const post = await getPostById(id)
  if (!post) return ErrorResponse({ statusCode: 401, message: "No post with this id found" })
  return new Response(post, {
    status: 200,
    headers: {
      ...apiHeaders
    }
  }
  )
})

router.post("/posts/:id/downvote", async ({ params }) => {
  const id = decodeURIComponent(params.id)
  if (!id) return ErrorResponse({ statusCode: 400, message: "Id is missing" })
  const post = await getPostById(id)
  if (!post) return ErrorResponse({ statusCode: 401, message: "No post with this id found" })
  return new Response(post, {
    status: 200,
    headers: {
      ...apiHeaders
    }
  }
  )
})


router.get("/posts/:id/", async ({ params }) => {
  const id = decodeURIComponent(params.id)
  if (!id) return ErrorResponse({ statusCode: 400, message: "Id is missing" })
  const post = await getPostById(id)
  if (!post) return ErrorResponse({ statusCode: 401, message: "No post with this id found" })
  return new Response(post, {
    status: 200,
    headers: {
      ...apiHeaders
    }
  }
  )
})

router.post('/images', async request => {
  try {
    const imageName = request.headers.get("x-filename");
    const imageBuffer = await request.arrayBuffer()
    const url = await uploadImage(imageName, imageBuffer)
    return new Response(url, {
      status: 200,
      headers: {
        ...apiHeaders
      }
    })
  } catch (e) {
    return ErrorResponse({ message: e.message })
  }
})





router.all("*", async (request) => {
  if (request.method == 'OPTIONS') {
    return new Response("OK", {
      headers: apiHeaders
    })
  }
  return ErrorResponse({ statusCode: 404, message: "Not found" })
})


addEventListener('fetch', (e) => {
  e.respondWith(router.handle(e.request))
})
