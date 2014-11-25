# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Generic functions for timeseries computations                               #
# Nabi Abudaldah, GEN B.V., 2014, v0.1                                        #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# Libraries
library(rmongodb)
library(xts)

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Generic functions that are static and do not need a DB connection           #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# Corrected version of periodicity {xts}
ts.periodicity <- function (x, ...) {
  if (timeBased(x) || !is.xts(x)) 
    x <- try.xts(x, error = "'x' needs to be timeBased or xtsible")
  p <- median(diff(.index(x)))
  if (is.na(p)) 
    stop("can not calculate periodicity of 1 observation")
  units <- "days"
  scale <- "yearly"
  label <- "year"
  if (p < 60) {
    units <- "secs"
    scale <- "seconds"
    label <- "second"
  }
  else if (p < 3600) {
    units <- "mins"
    scale <- "minute"
    label <- "minute"
    p <- p/60L
  }
  else if (p < 86400) {
    units <- "hours"
    scale <- "hourly"
    label <- "hour"
    p <- p/3600L
  }
  else if (p == 86400) {
    scale <- "daily"
    label <- "day"
    p <- 1
  }
  else if (p <= 604800) {
    scale <- "weekly"
    label <- "week"
  }
  else if (p <= 2678400) {
    scale <- "monthly"
    label <- "month"
  }
  else if (p <= 7948800) {
    scale <- "quarterly"
    label <- "quarter"
  }
  structure(list(difftime = structure(p, units = units, class = "difftime"), 
                 frequency = p, start = start(x), end = end(x), units = units, 
                 scale = scale, label = label), class = "periodicity")
}

# Parse interval specification (15m, 1h, 1d, etc) into interval format
# as expected by seq( ... by = ... ) function
ts.intervalParse <- function(interval){
  delta <- gsub("([0-9]+)(m|h|d)", "\\1", interval)
  unit  <- gsub("([0-9]+)(m|h|d)", "\\2", interval)
  unit  <- list('m'='mins', 'h'='hour', 'd'='DSTday')[[unit]]
  return(paste0(delta, ' ', unit))
}

# Calculate interval in seconds from interval specification (e.g. 1h to 3600sec
# or 15m to 900sec)
ts.intervalSeconds <- function(interval){
  delta   <- gsub("([0-9]+)(m|h|d)", "\\1", interval)
  unit    <- gsub("([0-9]+)(m|h|d)", "\\2", interval)
  seconds <- list('m'=60, 'h'=60*60, 'd'=60*60*24)[[unit]] * as.numeric(delta)
  return(seconds)
}

# Convert POSIXct to ISO8601 string (e.g. 2014-01-01T00:00:00+01:00)
ts.ISOformat <- function(time){
  s <- format(as.POSIXct(time), format="%Y-%m-%dT%H:%M:%S%z");
  s <- gsub("([^+-]+[+-][0-9]{2})([0-9]{2})", "\\1:\\2", s)
  return(s);
}

# Parse ISO8601 string into POSIXct object
ts.ISOparse <- function(string){
  string <- gsub(" ", "T", string)
  
  format <- ''
  if(length(grep("([0-9]{4})-([0-9]{2})-([0-9]{2})", string))){
    format <- paste0(format, '%Y-%m-%d')
  }
  
  if(length(grep("T([0-9]{2}):([0-9]{2})([^:]|$)", string))){
    format <- paste0(format, 'T%H:%M')
  }
  
  if(length(grep("T([0-9]{2}):([0-9]{2}):([0-9]{2})", string))){
    format <- paste0(format, 'T%H:%M:%S')
  }
  
  if(length(grep("([+-][0-9]{2}):([0-9]{2})", string))){
    format <- paste0(format, '%z')
    string <- gsub("([+-][0-9]{2}):([0-9]{2})", "\\1\\2", string)
  }
  
  time <- as.POSIXct(string, format=format)
  return(time)
}

ts.mean <- function(ts, na.rm=TRUE){
  return(mean(ts, na.rm=na.rm))
}

ts.sum <- function(ts, na.rm=TRUE){
  return(sum(ts, na.rm=na.rm))
}

ts.min <- function(ts, na.rm=TRUE){
  return(min(ts, na.rm=na.rm))
}

ts.max <- function(ts, na.rm=TRUE){
  return(max(ts, na.rm=na.rm))
}

ts.na <- function(ts){
  return(sum(is.na(ts)))
}

ts.len <- function(ts){
  return(length(ts))
}

# to should be optional and length too...
ts.seq <- function(from, to, interval = "1d"){
  interval <- ts.intervalParse(interval)
  from <- ts.ISOparse(from);
  to   <- ts.ISOparse(to);
  #time <- seq(from = from, to=to, by = interval, length.out = length(vector))
  time <- seq(from = from, to=to, by = interval)
  return(time)
}

ts.ones <- function(from, to, interval = "1d"){
  idx  <- ts.seq(from, to, interval)
  len  <- length(idx)
  ones <- xts(rep(1, len), idx)
  return(ones)
}

ts.zeros <- function(from, to, interval = "1d"){
  idx  <- ts.seq(from, to, interval)
  len  <- length(idx)
  zeros <- xts(rep(0, len), idx)
  return(zeros)
}

ts.random <- function(from, to, interval = "1d"){
  idx  <- ts.seq(from, to, interval)
  len  <- length(idx)
  random <- xts(runif(len), idx)
  return(random)
}

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Database relying functions for timeseries computations                      #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

trigger <- function(collection, id, property = NULL){
  if(is.null(property)){
    trigger <- list(event=paste0("update", context$pid), message=paste0(collection, "/", id));    
  } else { 
    trigger <- list(event=paste0("update", context$pid), message=paste0(collection, "/", id, "/", property));
  }
  mongo.insert(mongo, 'documents.triggers', trigger);
} 

trigger.my <- function(property = NULL){
  trigger(context$collection, context$id, property);
}

# Load one document from database by ID
doc <- function(collection, id){
  bson  <- mongo.find.one(mongo, paste0('documents.', collection), list('_id'=id));
  return(mongo.bson.to.Robject(bson));
}

# Load list of documents from database by regex pattern over ID
doc.n <- function(collection, regex){
  docs <- list();
  cursor <- mongo.find(mongo, paste0('documents.', collection), list('_id'=list('$regex'=regex)));
  while (mongo.cursor.next(cursor)) {
    bson <- mongo.cursor.value(cursor)
    id <- mongo.bson.value(bson, '_id')
    docs[[id]] <- mongo.bson.to.Robject(bson);
  }
  mongo.cursor.destroy(cursor)
  return(docs);
}

# Load one timeseries object from database and return an XTS object
ts <- function(timeseries = 'timeseries', id = NULL, collection = NULL){  
  if(!mongo.is.connected(mongo)) stop('Not connected to mongodb.');
  
  if(is.null(collection)) collection <- context$collection;  
  if(is.null(id)) id <- context$id;  
  
  projection <- paste0('{ "data.', timeseries, '": 1 }')
  bson  <- mongo.find.one(mongo, paste0('documents.', collection), list('_id'=id), projection);
  if(is.null(bson)) { warning('ts: object not found.'); return(NULL); }
  
  vector <- mongo.bson.value(bson, paste0('data.', timeseries, '.vector'));  
  
  interval <- ts.intervalParse(mongo.bson.value(bson, paste0('data.', timeseries, '.interval')))
  base <- ts.ISOparse(mongo.bson.value(bson, paste0('data.', timeseries, '.base')));
  time <- seq(from = base, by = interval, length.out = length(vector))
  ts <- xts(as.double(vector), time);
  colnames(ts) <- c(id);
  
  return(ts);
}

# Save one XTS timeseries object into database
ts.save <- function(ts, collection = 'timeseries', id = NULL, timeseries = 'timeseries'){
  
  if(!mongo.is.connected(mongo)){ 
    warning('tssave: not connected to mongodb.');
    return(FALSE); 
  }
  
  if(is.null(id)) id <- colnames(ts);
  
  base     <- ts.ISOformat(index(ts)[1]);
  
  ts.periodicity   <- ts.periodicity(ts);
  unit     <- list('mins'='m', 'hours'='h', 'days'='d')[[ts.periodicity$units]] 
  interval <- paste0(ts.periodicity$frequency, unit);
  vector   <- as.double(ts);
  
  upd <- list()
  upd[['$set']] <- list()
  upd[['$set']][['data']] <- list()
  upd[['$set']][['data']][[timeseries]] <- list(base=base,interval=interval,vector=vector)
  
  ok <- mongo.update(mongo, paste0('documents.', collection), list('_id'=id), upd, mongo.update.upsert);
  
  if(!ok) { warning('ts.save: update failed.'); return(NULL); }
  
  
  if(ok){
    trigger(collection, id, timeseries);
  }
  
  return(ok);
}

# Create one XTS timeseries object from a base date (ISO8601 string), 
# an interval specification (1m, 15m, 1h, 1d) and a R atomic vector
ts.new <- function(base, interval, vector){
  interval <- ts.intervalParse(interval)
  base     <- ts.ISOparse(base)
  time     <- seq(from = base, by = interval, length.out = length(vector))
  ts       <- xts(as.double(vector), time)
  return(ts)
}

# Load multiple timeseries objects from list of ID's
ts.n <- function(list){
  dat <- lapply(list, ts)
  mat <- Reduce(function(x, y) merge(x, y, all=TRUE), dat)
  return(mat)
}

# List timeseries objects by regex search string on ID
ts.list <- function(regex){
  query  <- list('_id'=list('$regex'=regex, '$options'='i'))
  list <- mongo.distinct(mongo, 'documents.timeseries', '_id', query)
  return(c(list))
}

# Load multiple timeseries objects of same interval (!) into a matrix
# by a regex search string on ID
ts.m <- function(regex, parse = FALSE, vectorize = TRUE){
  
  ids      <- c();
  base     <- c();
  interval <- c();
  vector   <- list();
  
  cursor <- mongo.find(mongo, 'documents.timeseries', list('_id'=list('$regex'=regex)),
                       list('_id'=1), list('_id'=1, 'tags'=1, 'data.timeseries'=1))
  while (mongo.cursor.next(cursor)) {
    bson <- mongo.cursor.value(cursor)
    id <- mongo.bson.value(bson, '_id')
    ids          <- c(ids, id)
    base         <- c(base,     mongo.bson.value(bson, 'data.timeseries.base'))
    interval     <- c(interval, mongo.bson.value(bson, 'data.timeseries.interval'))
    vector[[id]] <-             mongo.bson.value(bson, 'data.timeseries.vector');
    
    # In safety mode, reinterpret values properly (slow)
    if(parse) {
      vector[[id]] <- as.character(vector[[id]])
      vector[[id]] <- as.double(vector[[id]])
    }
    
    # BSON arrays can contain both int and doubles. Vectorize to make sure all
    # arary elements are of type double
    if(vectorize && !parse){
      vector[[id]] <- as.double(vector[[id]])      
    }
  }
  mongo.cursor.destroy(cursor)
  
  minBase <- min(base)
  if(length(unique(interval)) > 1) stop("Trying to fetch timeseries of different time intervals at once.")
  
  interval <- interval[1]
  
  seconds <- ts.intervalSeconds(interval)
  
  to <- ts.ISOparse(minBase)
  for(i in 1:(length(ids)-1)){
    from <- ts.ISOparse(base[i])
    padding <- as.double(difftime(from, to, units="secs")) / seconds;
    if(padding) vector[i] <- c(rep(NaN, padding), vector);
  }
  
  maxLength <- max(sapply(vector, length))
  
  vector <- lapply(vector, function(x){
    length(x) <- maxLength;
    return(x)
  })
  
  interval <- ts.intervalParse(interval)  
  minBase  <- ts.ISOparse(minBase)
  tm <- seq(from = minBase, by = interval, length.out = maxLength)
  
  vector <- do.call(cbind, vector)
  vector <- xts(vector, tm)
  
  return(vector)
}

# Return the sum of all given timeseries
ts.rsum <- function(ts, na.rm=TRUE){
  if(dim(ts)[2] > 1) return(xts(rowSums(ts, na.rm=na.rm), time(ts)))
  return(ts)
}

# Return the mean  of all given timeseries
ts.rmean <- function(ts, na.rm=TRUE){
  if(dim(ts)[2] > 1) return(xts(rowMeans(ts, na.rm=na.rm), time(ts)))
  return(ts)
}

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Context sensitive functions                                                 #
# these functions expect a 'context' list object, e.g.:                       #
# context <- list(collection='timeseries', id='nabi')                         #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

my <- function(property, value=NULL){
  
  if(!mongo.is.connected(mongo)) stop('my: not connected to mongodb.');
  
  collection <- context$collection
  id         <- context$id
  
  if(is.null(value)){
    projection <- list()
    projection[[property]] <- 1
    bson  <- mongo.find.one(mongo, paste0('documents.', collection), list('_id'=id), projection);
    if(is.null(bson)) { warning('my: object not found.'); return(NULL); }
    val <- mongo.bson.to.Robject(bson)[[property]]
    if(!is.na(as.numeric(val))) val <- as.numeric(val)
    return(val)
  } else {
    
    upd <- list()
    upd[['$set']] <- list()
    upd[['$set']][[property]] <- value
    
    ok <- mongo.update(mongo, paste0('documents.', collection), list('_id'=id), upd);
    
    if(ok){
      trigger(collection, id);
    }
    
    return(ok);
  }
}

my.ts <- function(timeseries='timeseries', ts=NULL){
  collection <- context$collection
  id <- context$id
  if(is.null(ts)){
    return(ts(timeseries=timeseries, id=id, collection=collection))      
  } else {
    return(ts.save(ts=ts, collection=collection, id=id, timeseries=timeseries))    
  }
}

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Tree summation function                                                     #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

tree.compute <- function(tree){
  nodes <- tree$nodes
  data  <- tree$data
  N     <- length(nodes)
  print(paste0('data: ', data, ', nodes: ', N))
  
  if(N == 0) { print(paste0('ts:   ', data)) }
  if(N  > 0) { print(paste0('tree: ', N)); lapply(nodes, tree.compute) }
  
  reference <- unlist(strsplit(unlist(data), "/"))
  print(reference)

   if(N == 0){
     return(ts(timeseries='timeseries', id=reference[2], collection=reference[1]))
   } else {
     subtree <- lapply(nodes, tree.compute);
     results <- Reduce(function(x, y) merge(x, y, all=TRUE), subtree)
     result <- xts(rowSums(results), index(results))
     ts.save(result, timeseries='timeseries', id=reference[2], collection=reference[1])
     return(result)
   }
}

tree <- function(collection, id, tree){
  if(is.null(collection) || is.null(id) || is.null(tree)) stop('please provide, collection, id and tree.')
  d <- doc(collection, id)
  
  return(tree.compute(d[[tree]]));
}

my.tree <- function(tree = NULL){
  tree <- ifelse(is.null(tree), 'tree', tree)
  return(tree(context$collection, context$id, tree));
}

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Connect to local MongoDB instance for immediate database use                #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

mongo <- NULL

if(is.null(mongo)){
  mongo <- mongo.create();  
}

if(is.null(mongo) || !mongo.is.connected(mongo)){
  stop('No database connection.')
}