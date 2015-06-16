# c2

The beginnings of a service discovery/dumb pipe event bus for easy docker style
deployments.

Written in es6 using [Babel](https://babeljs.io/).

### Background

I was looking for something lightweight to allow for service discovery/dumb pipe
message bus when working with container style deployments, and decided to write my own.

### Current State
Not even alpha, so don't try actually using it.

I have paused development to ponder whether writing this is a good idea. While a
simple and naive implementation is easy to do, in order to be production ready,
we need at least:

* Seamless failover to a backup service if this one goes down
* Consider how to deal with missed messages (a service loses connection
    momentarily and misses an important message it needs to act on, how to
    handle)
* If we are going to use something like redis to store messages, should we not
    just use redis pub-sub?

Other things I'm considering:
* Do we want to persist to disk? (probably a good idea)
* Allow for [blue green deployment](http://martinfowler.com/bliki/BlueGreenDeployment.html)
    with rollback
* Integration with 3rd party services for notifications (example, post a message to a               slack/hipchat room when a new version of a service shows up).
* A client module for services that want to use c2

And more I will add when I get around to it.

### How it works currently

#### Service Discovery

C2 runs waiting for websocket connections. When a service connects, it sends a
service definition to c2:
```
{
    name: 'carchase-service',
    requires: ['explosion-service'],
    port: 9877
}
```

If C2 doesn't have any explosion-services ready, it does nothing. Lets say that explosion service then connects:
```
{
    name: 'explosion-service',
    port: 8003
}
```
C2 will then notify carchase-service that explosion-service is ready:
```
{
  type: 'required-service',
  payload: {
    name: 'explosion-service',
    port: 8003,
    host: '10.9.8.10'
  }
}
```
If we now have another service connect:
```
{
    name: 'killer-robot-service',
    requires: ['explosion-service'],
    port: 6421
}
```
C2 has an active explosion-service ready, so it sends that info right away.
```
{
  type: 'required-service',
  payload: {
    name: 'explosion-service',
    port: 8003,
    host: '10.9.8.10'
  }
}
```

I plan to handle services that are behind a load balancer.

#### Message Pipe
Not started yet.
