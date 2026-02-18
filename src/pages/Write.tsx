import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlineSave,
    HiOutlineGlobeAlt,
    HiOutlinePhotograph,
    HiOutlineX,
} from 'react-icons/hi';
import {
    RiBold,
    RiItalic,
    RiUnderline,
    RiStrikethrough,
    RiListUnordered,
    RiListOrdered,
    RiImage2Line,
    RiLink,
    RiAlignLeft,
    RiAlignCenter,
    RiAlignRight,
    RiH1,
    RiH2,
    RiCodeSSlashLine,
    RiDoubleQuotesL,
} from 'react-icons/ri';
import './Write.css';

export default function Write() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isNew = !id;

    const [tags, setTags] = useState<string[]>(isNew ? [] : ['JavaScript', 'Web Dev']);
    const [tagInput, setTagInput] = useState('');

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    return (
        <div className="write-page animate-fade-in">
            <div className="write-header">
                <div className="write-header-left">
                    <button className="write-back-btn" onClick={() => navigate('/my-posts')}>
                        <HiOutlineArrowLeft />
                    </button>
                    <h1>{isNew ? 'Write New Post' : 'Edit Post'}</h1>
                </div>
                <div className="write-actions">
                    <button className="btn btn-outline">
                        <HiOutlineSave /> Save Draft
                    </button>
                    <button className="btn btn-primary">
                        <HiOutlineGlobeAlt /> Publish
                    </button>
                </div>
            </div>

            <div className="write-body">
                <div className="write-main">
                    {/* Cover Image */}
                    <div className="write-cover-upload">
                        <HiOutlinePhotograph className="write-cover-icon" />
                        <span className="write-cover-text">Add Cover Image</span>
                        <span className="write-cover-hint">Recommended: 1200×630px · JPG, PNG</span>
                    </div>

                    {/* Title */}
                    <div className="write-field">
                        <input
                            type="text"
                            className="write-title-input"
                            placeholder="Your awesome title here..."
                            defaultValue={isNew ? '' : 'Building Scalable Web Applications with Modern Frameworks'}
                        />
                    </div>

                    {/* Tags */}
                    <div className="write-field">
                        <label>Tags</label>
                        <div className="write-tags-container">
                            {tags.map(tag => (
                                <span key={tag} className="write-tag">
                                    {tag}
                                    <button className="write-tag-remove" onClick={() => removeTag(tag)}>
                                        <HiOutlineX />
                                    </button>
                                </span>
                            ))}
                            <input
                                type="text"
                                className="write-tag-input"
                                placeholder="Type a tag and press Enter..."
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                            />
                        </div>
                    </div>

                    {/* Content Editor */}
                    <div className="card write-content-card">
                        <div className="write-toolbar">
                            <button className="write-toolbar-btn"><RiH1 /></button>
                            <button className="write-toolbar-btn"><RiH2 /></button>
                            <div className="write-toolbar-divider" />
                            <button className="write-toolbar-btn active"><RiBold /></button>
                            <button className="write-toolbar-btn"><RiItalic /></button>
                            <button className="write-toolbar-btn"><RiUnderline /></button>
                            <button className="write-toolbar-btn"><RiStrikethrough /></button>
                            <div className="write-toolbar-divider" />
                            <button className="write-toolbar-btn"><RiAlignLeft /></button>
                            <button className="write-toolbar-btn"><RiAlignCenter /></button>
                            <button className="write-toolbar-btn"><RiAlignRight /></button>
                            <div className="write-toolbar-divider" />
                            <button className="write-toolbar-btn"><RiListUnordered /></button>
                            <button className="write-toolbar-btn"><RiListOrdered /></button>
                            <div className="write-toolbar-divider" />
                            <button className="write-toolbar-btn"><RiDoubleQuotesL /></button>
                            <button className="write-toolbar-btn"><RiCodeSSlashLine /></button>
                            <div className="write-toolbar-divider" />
                            <button className="write-toolbar-btn"><RiLink /></button>
                            <button className="write-toolbar-btn"><RiImage2Line /></button>
                        </div>
                        <textarea
                            className="write-textarea"
                            placeholder="Tell your story..."
                            defaultValue={isNew ? '' : 'Explore the best practices and architectural patterns that help you build web apps that scale gracefully under heavy traffic.\n\nIn this article, we\'ll cover:\n\n1. Choosing the right framework for your project\n2. Component architecture and state management\n3. Performance optimization strategies\n4. Deployment and scaling considerations\n\nLet\'s dive in...'}
                        />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="write-sidebar">
                    <div className="card write-panel">
                        <h3>Post Settings</h3>
                        <div className="write-panel-field">
                            <label>Category</label>
                            <select className="write-select" defaultValue="technology">
                                <option value="technology">Technology</option>
                                <option value="design">Design</option>
                                <option value="lifestyle">Lifestyle</option>
                                <option value="business">Business</option>
                            </select>
                        </div>
                        <div className="write-panel-field">
                            <label>Reading Time (auto)</label>
                            <input type="text" className="write-seo-input" value="~8 min read" disabled />
                        </div>
                    </div>

                    <div className="card write-panel">
                        <h3>SEO</h3>
                        <div className="write-panel-field">
                            <label>Meta Title</label>
                            <input type="text" className="write-seo-input" placeholder="SEO title..." />
                        </div>
                        <div className="write-panel-field">
                            <label>Meta Description</label>
                            <textarea className="write-seo-textarea" placeholder="Write a short description..." />
                        </div>
                    </div>

                    <div className="write-tips">
                        <h4>💡 Writing Tips</h4>
                        <ul>
                            <li>Use a compelling headline</li>
                            <li>Break content into sections</li>
                            <li>Add images to engage readers</li>
                            <li>End with a clear call-to-action</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
