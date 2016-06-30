oauthd nano api
=================

This is the nano api plugin for oauthd. It exposes a few selected API's as RPC over nanomsg.

For more information, please check out [oauthd's repository](https://github.com/oauth-io/oauthd).

Installation
------------

To install this plugin in an oauthd instance, just run the following command (you need to have oauthd installed):

```sh
$ oauthd plugins install https://github.com/redsift/oauthd-nanoapi.git
```

If you want to install a specific version or branch of this plugin, just run:

```sh
$ oauthd plugins install https://github.com/redsift/oauthd-nanoapi.git#branch_or_tag
```