module Jekyll
  class AuthotTag < Liquid::Tag

    def initialize(tag_name, author, tokens)
      super
      @author = author
    end

    def render(context)
      "<div class=\"tag\">
        #{@author}
      </div>"
    end
  end
end

Liquid::Template.register_tag('author', Jekyll::AuthotTag)
