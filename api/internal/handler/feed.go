package handler

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type FeedHandler struct {
	service *service.FeedService
	says    *service.SayService
}

func NewFeedHandler(feedService *service.FeedService, says *service.SayService) *FeedHandler {
	return &FeedHandler{service: feedService, says: says}
}

func (h *FeedHandler) Sitemap(c *gin.Context) {
	site, posts, err := h.service.Data(c.Request.Context(), 0, "")
	if err != nil {
		contentError(c, err)
		return
	}
	type page struct {
		Loc     string `xml:"loc"`
		LastMod string `xml:"lastmod,omitempty"`
	}
	result := struct {
		XMLName xml.Name `xml:"urlset"`
		Xmlns   string   `xml:"xmlns,attr"`
		Pages   []page   `xml:"url"`
	}{Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9"}
	for _, path := range []string{"/", "/posts", "/archive", "/topics", "/notes", "/thinking", "/says", "/timeline", "/subscribe", "/about", "/friends", "/projects"} {
		result.Pages = append(result.Pages, page{Loc: site.SiteURL + path})
	}
	series, err := h.service.NoteSeries(c.Request.Context())
	if err != nil {
		contentError(c, err)
		return
	}
	if len(series) > 0 {
		result.Pages = append(result.Pages, page{Loc: site.SiteURL + "/notes/series"})
		for _, item := range series {
			result.Pages = append(result.Pages, page{Loc: site.SiteURL + "/notes/series/" + url.PathEscape(item.Slug)})
		}
	}
	for _, kind := range []string{"categories", "tags"} {
		terms, err := h.service.PublicTerms(c.Request.Context(), kind)
		if err != nil {
			contentError(c, err)
			return
		}
		for _, term := range terms {
			result.Pages = append(result.Pages, page{Loc: site.SiteURL + "/" + kind + "/" + url.PathEscape(term.Slug)})
		}
	}
	pages, err := h.service.Pages(c.Request.Context())
	if err != nil {
		contentError(c, err)
		return
	}
	if len(pages) > 0 {
		result.Pages = append(result.Pages, page{Loc: site.SiteURL + "/pages"})
		for _, item := range pages {
			result.Pages = append(result.Pages, page{Loc: site.SiteURL + "/pages/" + url.PathEscape(item.Slug), LastMod: item.UpdatedAt.UTC().Format("2006-01-02")})
		}
	}
	for _, post := range posts {
		result.Pages = append(result.Pages, page{Loc: site.SiteURL + contentPath(post.Kind, post.Slug), LastMod: post.UpdatedAt.UTC().Format("2006-01-02")})
	}
	writeXML(c, result)
}

func (h *FeedHandler) RSS(c *gin.Context)         { h.rss(c, "") }
func (h *FeedHandler) NotesRSS(c *gin.Context)    { h.rss(c, "note") }
func (h *FeedHandler) ThinkingRSS(c *gin.Context) { h.rss(c, "thought") }

func (h *FeedHandler) rss(c *gin.Context, kind string) {
	site, posts, err := h.service.Data(c.Request.Context(), 20, kind)
	if err != nil {
		contentError(c, err)
		return
	}
	type item struct {
		Title       string `xml:"title"`
		Link        string `xml:"link"`
		Guid        string `xml:"guid"`
		Description string `xml:"description"`
		PubDate     string `xml:"pubDate"`
	}
	result := struct {
		XMLName xml.Name `xml:"rss"`
		Version string   `xml:"version,attr"`
		Channel struct {
			Title       string `xml:"title"`
			Link        string `xml:"link"`
			Description string `xml:"description"`
			Items       []item `xml:"item"`
		} `xml:"channel"`
	}{Version: "2.0"}
	result.Channel.Title = site.Title
	result.Channel.Link = site.SiteURL
	result.Channel.Description = site.Description
	if kind == "note" {
		result.Channel.Title += " · 手记"
		result.Channel.Link += "/notes"
	} else if kind == "thought" {
		result.Channel.Title += " · 思考"
		result.Channel.Link += "/thinking"
	}
	for _, post := range posts {
		link := site.SiteURL + contentPath(post.Kind, post.Slug)
		result.Channel.Items = append(result.Channel.Items, item{Title: post.Title, Link: link, Guid: link, Description: post.Excerpt, PubDate: post.PublishedAt.Format(time.RFC1123Z)})
	}
	writeXML(c, result)
}

func (h *FeedHandler) SaysRSS(c *gin.Context) {
	site, err := h.service.Site(c.Request.Context())
	if err != nil {
		contentError(c, err)
		return
	}
	says, _, err := h.says.List(c.Request.Context(), true, 1, 20)
	if err != nil {
		contentError(c, err)
		return
	}
	type item struct {
		Title       string `xml:"title"`
		Link        string `xml:"link"`
		Guid        string `xml:"guid"`
		Description string `xml:"description"`
		PubDate     string `xml:"pubDate"`
	}
	result := struct {
		XMLName xml.Name `xml:"rss"`
		Version string   `xml:"version,attr"`
		Channel struct {
			Title string `xml:"title"`
			Link  string `xml:"link"`
			Items []item `xml:"item"`
		} `xml:"channel"`
	}{Version: "2.0"}
	result.Channel.Title = site.Title + " · 一言"
	result.Channel.Link = site.SiteURL + "/says"
	for _, say := range says {
		runes := []rune(say.Text)
		if len(runes) > 60 {
			runes = runes[:60]
		}
		link := fmt.Sprintf("%s#say-%d", result.Channel.Link, say.ID)
		description := say.Text
		if say.Source != "" {
			description += "\n出处：" + say.Source
		}
		if say.Author != "" {
			description += "\n作者：" + say.Author
		}
		result.Channel.Items = append(result.Channel.Items, item{
			Title: string(runes), Link: link, Guid: link, Description: description, PubDate: say.CreatedAt.Format(time.RFC1123Z),
		})
	}
	writeXML(c, result)
}

func contentPath(kind, slug string) string {
	if kind == "note" {
		return "/notes/" + url.PathEscape(slug)
	}
	if kind == "thought" {
		return "/thinking/" + url.PathEscape(slug)
	}
	return "/posts/" + url.PathEscape(slug)
}

func (h *FeedHandler) Robots(c *gin.Context) {
	site, err := h.service.Site(c.Request.Context())
	if err != nil {
		contentError(c, err)
		return
	}
	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(fmt.Sprintf("User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n", site.SiteURL)))
}

func writeXML(c *gin.Context, data any) {
	body, err := xml.MarshalIndent(data, "", "  ")
	if err != nil {
		contentError(c, err)
		return
	}
	c.Data(http.StatusOK, "application/xml; charset=utf-8", append([]byte(xml.Header), body...))
}
