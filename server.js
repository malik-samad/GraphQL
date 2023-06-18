const express = require('express')
const db = require("./db.json")
const {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLList
} = require('graphql');
const {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  shouldRenderGraphiQL
} = require('graphql-helix');

// [start] GraphQL Types and Schema
const AuthorType = new GraphQLObjectType({
    name: "authors",
    fields: ()=>({
        id: {type:new GraphQLNonNull(GraphQLInt)},
        name: {type: GraphQLString},
        books: {
            type: new GraphQLList(BookType),
            resolve: (parent) => db.books.filter(itm => itm.authorId == parent.id)
        }
    })
})


const BookType = new GraphQLObjectType({
    name: "book",
    fields: ()=>({
        id: {type: new GraphQLNonNull(GraphQLInt)},
        name: {type: GraphQLString},
        authorId: {type: GraphQLInt},
        author: {
            type: AuthorType,
            resolve: (parent) => db.authors.find(itm => itm.id == parent.authorId)
        }
    })
})

const RootQuery = new GraphQLObjectType({
    name: 'RootQuery',
    fields: {
      authors: {
        type: new GraphQLList(AuthorType),
        resolve: () => db.authors,
      },
      books: {
        type: new GraphQLList(BookType),
        resolve: () => db.books
      },
      book: {
        type: BookType,
        args:{id:{type: GraphQLInt}},
        resolve: (parent, args) => db.books.find(itm => args.id == itm.id)
      },
      author: {
        type: AuthorType,
        args: {id: {type:GraphQLInt}},
        resolve: (parent, args) => db.authors.find(itm => itm.id == args.id)
      }
    },
})

const RootMutation = new GraphQLObjectType({
    name: "RootMutation",
    fields: {
        addBook:{
            type: BookType,
            args: {
                name: {type: new GraphQLNonNull(GraphQLString)},
                authorId: {type: new GraphQLNonNull(GraphQLInt)},
            },
            resolve: (parent, args) => {
                const book = {id: db.books.length+1, name: args.name, authorId: args.authorId};
                db.books.push(book);
                return book;
            }
        },
        updateBook:{
            type: BookType,
            args: {
                id: {type: new GraphQLNonNull(GraphQLInt)},
                name: {type: GraphQLString},
                authorId: {type: GraphQLInt},
            },
            resolve: (parent, args) => {
                const index = db.books.findIndex(itm => itm.id == args.id)
                db.books[index].authorId = args.authorId || db.books[index].authorId
                db.books[index].name = args.name || db.books[index].name
                
                return db.books[index];
            }
        },
        deleteBook:{
            type: BookType,
            args: {
                id: {type: new GraphQLNonNull(GraphQLInt)},
            },
            resolve: (parent, args) => {
                const book = db.books.find(itm => itm.id == args.id);
                db.books = db.books.filter(itm => itm.id !== args.id);

                return book;
            }
        },
        addAuthor:{
            type: AuthorType,
            args: {
                name: {type: new GraphQLNonNull(GraphQLString)},
            },
            resolve: (parent, args) => {
                const author = {id: db.authors.length+1, name: args.name};
                db.authors.push(author);
                return author;
            }
        },
        deleteAuthor:{
            type: AuthorType,
            args: {
                id: {type: new GraphQLNonNull(GraphQLInt)},
            },
            resolve: (parent, args) => {
                const author = db.authors.find(itm => itm.id == args.id);
                db.authors = db.authors.filter(itm => itm.id !== args.id);
 
                return author;
            }
        },
        updateAuthor:{
            type: AuthorType,
            args: {
                id: {type: new GraphQLNonNull(GraphQLInt)},
                name: {type: GraphQLString}
            },
            resolve: (parent, args) => {
                const index = db.authors.findIndex(itm => itm.id == args.id)
                db.authors[index].name = args.name || db.authors[index].name
                
                return db.authors[index];
            }
        },
    }
})

const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation
});
// [end] GraphQL Types and Schema

const app = express();

app.use(express.json());
app.use('/graphql', async (req, res) => {
  const request = {
    body: req.body,
    headers: req.headers,
    method: req.method,
    query: req.query,
  };

  if (shouldRenderGraphiQL(request)) {
    res.send(renderGraphiQL());
  } else {
    const { operationName, query, variables } = getGraphQLParameters(request);

    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema,
    });

    if (result.type === 'RESPONSE') {
      result.headers.forEach(({ name, value }) => res.setHeader(name, value));
      res.status(result.status);
      res.json(result.payload);
    } else {
        // graphql-helix also supports subscriptions and incremental delivery (i.e. @defer and @stream directives)
        // out of the box. See the repo for more complete examples that also implement those features.
    }
  }
});


app.listen(5000, () => console.log("Server is running on Port 5000"));
