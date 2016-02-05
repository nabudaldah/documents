
# Load libraries
library(magrittr)

# Enable DataBox R client
source('https://databoxapp.com/client/DataBox.R')

# Open connection
dbx <- DataBox(user ='username', pass = 'password')

# Test size
N <- 10

# Create N objects
for(i in 1:N) {
  id <- paste0('doc-', i)
  ob <- list(x = rnorm(1), '_tags' = c('a', 'b'))
  rs <- dbx$set(id, ob)
  print(rs)
  rm(id, ob, rs, i)
}

# Fetch everything in my DataBox
lst <- list()
for(it in dbx$list(limit = N)){
  id <- it[['_id']]
  print(id)
  ob <- dbx$get(id)
  lst[[id]] <- ob
  rm(it, id, ob)
}

# Compute average of x property
lapply(lst, function(x){ x[['x']] }) %>% unlist %>% as.vector %>% mean

# Delete all objects again
lapply(lst, function(x){ dbx$del(x[['_id']]) })

