library(httr)

DataBox <- setRefClass("DataBox",
  fields = list(
    user = "character",
    pass = "character",
    url  = "character"
  ),
  methods = list(
    initialize = function(..., user = NULL, pass = NULL, url = "https://databoxapp.com/api"){
      callSuper(..., user = user, pass = pass, url = url)
    },
    open = function(user, pass) {
      user <<- user
      pass <<- pass
    },
    list = function(query = '', skip = 0, limit = 24, fields = '') {
      auth <- authenticate(user, pass, type = "basic")
      conf <- config(ssl_verifypeer = F)
      urlx <- paste0(url, '/', user, '?query=', query, '&skip=', skip, '&limit=', limit, '&fields=', fields)
      result <- GET(urlx, auth, conf)
      warn_for_status(result)
      result <- content(result)
      return(result)
    },
    get = function(id) {
      auth <- authenticate(user, pass, type = "basic")
      conf <- config(ssl_verifypeer = F)
      urlx <- paste0(url, '/', user, '/', id)
      result <- GET(urlx, auth, conf)
      warn_for_status(result)
      result <- content(result)
      return(result)
    },
    set = function(id, obj) {
      auth <- authenticate(user, pass, type = "basic")
      conf <- config(ssl_verifypeer = F)
      urlx <- paste0(url, '/', user, '/', id)
      result <- POST(urlx, body = obj, encode = "json", auth, conf)
      warn_for_status(result)
      status <- http_status(result)
      return(status$message)
    },
    del = function(id){
      auth <- authenticate(user, pass, type = "basic")
      conf <- config(ssl_verifypeer = F)
      urlx <- paste0(url, '/', user, '/', id)
      result <- DELETE(urlx, auth, conf)
      warn_for_status(result)
      status <- http_status(result)
      return(status$message)
    }
  )
)